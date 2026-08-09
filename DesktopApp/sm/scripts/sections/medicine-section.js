$(document).ready(function () {
  let medicinesData = {};
  let medicinesById = {};
  let allMedicinesList = [];
  let medicineBrandVisitMap = {};

  function getBrandVisitInfo(brandName) {
    const key = String(brandName || "")
      .trim()
      .toLowerCase();
    if (!key) {
      return null;
    }
    return medicineBrandVisitMap[key] || null;
  }

  function getVisitBadge(rank) {
    if (rank === 1) return "🟢1";
    if (rank === 2) return "🟠2";
    if (rank === 3) return "🔵3";
    return "";
  }

  function normalizeMedicineInputValue(value) {
    return common.normalizeMedicineBrandName(value);
  }

  function getMedicineDisplayLabel(medicine) {
    const visitInfo = getBrandVisitInfo(medicine.medicinename);
    if (visitInfo) {
      return `${medicine.medicinename} ${getVisitBadge(visitInfo.rank)}`;
    }
    return medicine.medicinename;
  }

  function rebuildDatalist() {
    const dataList = $("#medicineSuggestions");
    dataList.empty();

    allMedicinesList.forEach((medicine) => {
      dataList.append(
        `<option value="${common.escapeHtml(getMedicineDisplayLabel(medicine))}"></option>`
      );
    });
  }

  function resolveMedicineFromInput(value) {
    const trimmed = normalizeMedicineInputValue(value);
    if (!trimmed) {
      return null;
    }

    if (medicinesData[trimmed]) {
      return medicinesData[trimmed];
    }

    const circleMatch = String(value || "")
      .trim()
      .match(/^(.+?)\s+[🟢🟠🔵][123]$/);
    if (circleMatch) {
      const brandName = circleMatch[1].trim();
      if (medicinesData[brandName]) {
        return medicinesData[brandName];
      }
    }

    const visitMatch = trimmed.match(/^(.+?)\s+\((1|2|3)\)$/);
    if (visitMatch) {
      const brandName = visitMatch[1].trim();
      if (medicinesData[brandName]) {
        return medicinesData[brandName];
      }
    }

    const legacyVisitMatch = trimmed.match(
      /^(.+?)\s+\((Last Visit|2nd Last Visit|3rd Last Visit)\)$/
    );
    if (legacyVisitMatch) {
      const brandName = legacyVisitMatch[1].trim();
      if (medicinesData[brandName]) {
        return medicinesData[brandName];
      }
    }

    return (
      allMedicinesList.find(
        (medicine) =>
          getMedicineDisplayLabel(medicine).toLowerCase() ===
            String(value || "").trim().toLowerCase() ||
          medicine.medicinename.toLowerCase() === trimmed.toLowerCase()
      ) || null
    );
  }

  function normalizeGenericKey(genericKey) {
    return String(genericKey || "")
      .trim()
      .toLowerCase();
  }

  function getBrandSelectLabel(brand) {
    return getMedicineDisplayLabel(brand);
  }

  function getGenericGroupKey(medicine) {
    const genericFromField = normalizeGenericKey(common.getMedicineGenericKey(medicine));
    if (genericFromField) {
      return genericFromField;
    }

    return normalizeGenericKey(medicine.medicinename);
  }

  function getBrandsForGeneric(medicine) {
    const groupKey = getGenericGroupKey(medicine);
    if (!groupKey) {
      return [];
    }

    return allMedicinesList
      .filter((item) => {
        const itemGeneric = normalizeGenericKey(common.getMedicineGenericKey(item));
        const itemBrand = normalizeGenericKey(item.medicinename);
        return itemGeneric === groupKey || itemBrand === groupKey;
      })
      .sort((a, b) => {
        const visitA = getBrandVisitInfo(a.medicinename);
        const visitB = getBrandVisitInfo(b.medicinename);

        if (visitA && visitB && visitA.rank !== visitB.rank) {
          return visitA.rank - visitB.rank;
        }
        if (visitA && !visitB) {
          return -1;
        }
        if (!visitA && visitB) {
          return 1;
        }

        return a.medicinename.localeCompare(b.medicinename);
      });
  }

  function hideBrandSelect(row) {
    row.find(".medicine-brand-select-wrap").addClass("d-none");
    row.find(".medicine-brand-select").empty();
  }

  function showBrandSelect(row, medicine, brands) {
    const brandSelect = row.find(".medicine-brand-select");
    const brandWrap = row.find(".medicine-brand-select-wrap");

    brandSelect.empty();
    brands.forEach((brand) => {
      brandSelect.append(
        $("<option></option>").attr("value", brand.id).text(getBrandSelectLabel(brand))
      );
    });

    brandSelect.val(String(medicine.id));
    brandWrap.removeClass("d-none");
    row.find(".medicine-id").val(String(medicine.id));
  }

  function setMedicineInputDisplay(row, medicine) {
    const input = row.find(".medicine-input").not(".flexdatalist-alias").first();
    const displayValue = getMedicineDisplayLabel(medicine);

    if (input.val() !== displayValue) {
      input.val(displayValue);
    }
  }

  function applyMedicineVisitHighlight(row) {
    const input = row.find(".medicine-input").not(".flexdatalist-alias").first();
    input.removeClass(
      "medicine-visit-last medicine-visit-second medicine-visit-third"
    );

    const medicine = resolveMedicineFromInput(input.val());
    const visitInfo = medicine ? getBrandVisitInfo(medicine.medicinename) : null;
    if (!visitInfo) {
      return;
    }

    const style = common.getMedicineVisitStyle(visitInfo.rank);
    if (style) {
      input.addClass(style.rowClass);
    }
  }

  function refreshMedicineInputDisplays() {
    $("#medicineContainer .medicine-row").each(function () {
      const row = $(this);
      const input = row.find(".medicine-input").not(".flexdatalist-alias").first();
      const medicine = resolveMedicineFromInput(input.val());

      if (!medicine) {
        hideBrandSelect(row);
        applyMedicineVisitHighlight(row);
        return;
      }

      if (getBrandVisitInfo(medicine.medicinename)) {
        setMedicineInputDisplay(row, medicine);
      }

      updateBrandSelect(row, medicine);
      applyMedicineVisitHighlight(row);
    });
  }

  async function loadMedicineVisitHistory() {
    const mrNumber = $("#txtMrNumber").val()?.trim();
    if (!mrNumber) {
      medicineBrandVisitMap = {};
      window.medicineBrandVisitMap = medicineBrandVisitMap;
      rebuildDatalist();
      return;
    }

    try {
      const visits = await window.electronAPI.getPatientVisits(mrNumber);
      medicineBrandVisitMap = common.buildMedicineBrandVisitMap(visits);
    } catch (error) {
      console.error("Error fetching medicine visit history:", error);
      medicineBrandVisitMap = {};
    }

    window.medicineBrandVisitMap = medicineBrandVisitMap;
    rebuildDatalist();
  }

  function updateBrandSelect(row, medicine) {
    const brands = getBrandsForGeneric(medicine);
    const visitInfo = getBrandVisitInfo(medicine.medicinename);

    if (!visitInfo || brands.length <= 1) {
      hideBrandSelect(row);
      row.find(".medicine-id").val(String(medicine.id));
      return;
    }

    showBrandSelect(row, medicine, brands);
  }

  function populateMedicineRowFromCatalog(medicineRow, medicineDetails) {
    medicineRow
      .find(".medicine-type")
      .val(medicineDetails.medicinetype)
      .trigger("change");

    medicineRow.find(".inj-type").val(medicineDetails.injType);
    medicineRow.find(".quantity").val(medicineDetails.quantity);

    if (medicineDetails.timingType) {
      medicineRow
        .find(".timing-type")
        .val(medicineDetails.timingType)
        .trigger("change");
      medicineRow.find(".timing-checkbox").prop("disabled", true);
    } else {
      medicineRow.find(".morning").prop("checked", medicineDetails.morning === 1);
      medicineRow
        .find(".afternoon")
        .prop("checked", medicineDetails.afternoon === 1);
      medicineRow.find(".night").prop("checked", medicineDetails.night === 1);
      medicineRow.find(".timing-type").val("").prop("disabled", false);
    }

    medicineRow
      .find(".printable")
      .prop("checked", medicineDetails.isPrintableOnPrescription);
    medicineRow.find(".duration-number").val(medicineDetails.durationnumber);
    medicineRow.find(".duration").val(medicineDetails.duration);
    medicineRow.find(".more-detail").val(medicineDetails.moredetail);
  }

  function handleMedicineSelected(row, medicine) {
    setMedicineInputDisplay(row, medicine);
    row.find(".medicine-id").val(String(medicine.id));
    populateMedicineRowFromCatalog(row, medicine);
    updateBrandSelect(row, medicine);
    applyMedicineVisitHighlight(row);
  }

  function clearMedicineSelection(row) {
    hideBrandSelect(row);
    row.find(".medicine-id").val("");
    row.find(".medicine-input").not(".flexdatalist-alias").removeClass(
      "medicine-visit-last medicine-visit-second medicine-visit-third"
    );
  }

  window.refreshMedicineVisitHistory = async function () {
    await loadMedicineVisitHistory();
    refreshMedicineInputDisplays();
  };

  window.applyMedicineVisitHighlightToRow = function (row) {
    const $row = $(row);
    const medicine = resolveMedicineFromInput(
      $row.find(".medicine-input").not(".flexdatalist-alias").first().val()
    );

    if (medicine && getBrandVisitInfo(medicine.medicinename)) {
      setMedicineInputDisplay($row, medicine);
    }

    if (medicine) {
      updateBrandSelect($row, medicine);
    }

    applyMedicineVisitHighlight($row);
  };

  window.initMedicineBrandRow = function (row, savedMedicine) {
    row = $(row);
    let catalogMedicine = null;

    if (savedMedicine?.medicineId && medicinesById[String(savedMedicine.medicineId)]) {
      catalogMedicine = medicinesById[String(savedMedicine.medicineId)];
    } else if (savedMedicine?.medicinename) {
      catalogMedicine = resolveMedicineFromInput(savedMedicine.medicinename);
    }

    if (!catalogMedicine) {
      clearMedicineSelection(row);
      return;
    }

    setMedicineInputDisplay(row, catalogMedicine);
    row.find(".medicine-id").val(String(catalogMedicine.id));
    updateBrandSelect(row, catalogMedicine);
    applyMedicineVisitHighlight(row);
  };

  async function init() {
    try {
      const medicines = await window.electronAPI.getMedicine();
      medicinesData = {};
      medicinesById = {};
      allMedicinesList = medicines || [];

      allMedicinesList.forEach((medicine) => {
        medicinesData[medicine.medicinename] = medicine;
        medicinesById[String(medicine.id)] = medicine;
      });

      window.medicineCatalogByName = medicinesData;
      window.medicineCatalogById = medicinesById;
      rebuildDatalist();
    } catch (error) {
      console.error("Error fetching medicines:", error);
    }
  }

  $("#addMedicineBtn").on("click", function (event) {
    init();
    event.preventDefault();
    const newRowHtml = common.getMedicineRow();
    $("#medicineContainer tbody").append(newRowHtml);
  });

  $(document).on("change", "select[name='medicineType']", function () {
    const medicineRow = $(this).closest("tr");
    const injType = medicineRow.find("#injType");

    if ($(this).val() === "Inj") {
      injType.show();
    } else {
      injType.hide();
    }
  });

  $(document).on("change", ".medicine-type", function () {
    const medicineRow = $(this).closest("tr");
    const injType = medicineRow.find(".inj-type");

    if ($(this).val() === "Inj") {
      injType.removeClass("hidden");
    } else {
      injType.addClass("hidden");
    }
  });

  $(document).on("change", ".timing-type", function () {
    const row = $(this).closest("tr");
    if ($(this).val()) {
      row.find(".timing-checkbox").prop("checked", false).prop("disabled", true);
    } else {
      row.find(".timing-checkbox").prop("disabled", false);
    }
  });

  $(document).on("change", ".timing-checkbox", function () {
    const row = $(this).closest("tr");
    if (row.find(".timing-checkbox:checked").length > 0) {
      row.find(".timing-type").prop("disabled", true);
      row.find(".timing-type").val("");
    } else {
      row.find(".timing-type").prop("disabled", false);
    }
  });

  $(document).on("click", ".remove-medicine", async function (event) {
    event.preventDefault();
    if (
      !(await common.confirmDelete({
        title: "Remove medicine?",
        text: "This medicine will be removed from the prescription.",
        confirmButtonText: "Yes, remove it!",
      }))
    ) {
      return;
    }

    $(this).closest("tr").remove();
  });

  $(document).on("input change", ".medicine-input", function () {
    if ($(this).hasClass("flexdatalist-alias") || $(this).hasClass("flexdatalist-set")) {
      return;
    }

    const medicineRow = $(this).closest("tr");
    const medicine = resolveMedicineFromInput($(this).val());

    if (!medicine) {
      clearMedicineSelection(medicineRow);
      return;
    }

    handleMedicineSelected(medicineRow, medicine);
  });

  $(document).on("change", ".medicine-brand-select", function () {
    const medicineRow = $(this).closest("tr");
    const medicineId = $(this).val();
    const medicine = medicinesById[String(medicineId)];

    if (!medicine) {
      return;
    }

    handleMedicineSelected(medicineRow, medicine);
  });

  init().then(loadMedicineVisitHistory).then(refreshMedicineInputDisplays);
});

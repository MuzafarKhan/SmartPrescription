(function () {
  let allMedicinesCache = [];

  function medicineMatchesSearch(medicine, term) {
    const query = String(term || "").trim().toLowerCase();
    if (!query) {
      return true;
    }

    const searchable = [
      medicine.id,
      medicine.medicinename,
      medicine.medicinegenericname,
      medicine.medicinetype,
      medicine.injType,
      medicine.quantity,
      medicine.timingType,
      medicine.duration,
      medicine.durationnumber,
      medicine.moredetail,
      getTimingInEnglish(medicine).replace(/<[^>]*>/g, " "),
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return searchable.includes(query);
  }

  function filterMedicines(medicines, term) {
    return (medicines || []).filter((medicine) => medicineMatchesSearch(medicine, term));
  }

  function applyMedicineSearch(term) {
    renderMedicineTable(filterMedicines(allMedicinesCache, term));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getGenericKey(medicine) {
    return (medicine.medicinegenericname || "").trim();
  }

  function getGenericLabel(key) {
    return key || "No Generic Name";
  }

  function sortMedicinesForGrouping(medicines) {
    return [...medicines].sort((a, b) => {
      const ga = getGenericKey(a).toLowerCase() || "\uffff";
      const gb = getGenericKey(b).toLowerCase() || "\uffff";
      if (ga !== gb) return ga.localeCompare(gb);
      return a.medicinename.localeCompare(b.medicinename);
    });
  }

  function groupMedicines(medicines) {
    const groups = [];
    let currentGroup = null;

    sortMedicinesForGrouping(medicines).forEach((medicine) => {
      const key = getGenericKey(medicine);
      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = { key, label: getGenericLabel(key), items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(medicine);
    });

    return groups;
  }

  function buildRowActions(medicineId) {
    return (
      '<button class="btn btn-warning btn-sm" onclick="openEditMedicine(' +
      medicineId +
      ',event)">Update</button>' +
      '<button class="btn btn-danger btn-sm ms-1" onclick="deleteMedicine(' +
      medicineId +
      ',event)">Delete</button>'
    );
  }

  function buildGenericCell(group) {
    const copyFromId = group.items[0].id;
    const countLabel =
      group.items.length === 1 ? "1 brand" : group.items.length + " brands";

    return (
      '<div class="medicine-generic-cell-inner">' +
      '<div class="medicine-generic-name">' +
      escapeHtml(group.label) +
      "</div>" +
      '<div class="medicine-generic-count">' +
      escapeHtml(countLabel) +
      "</div>" +
      '<button type="button" class="btn btn-info btn-sm mt-2" onclick="copyMedicine(' +
      copyFromId +
      ',event)">Copy</button>' +
      "</div>"
    );
  }

  function renderMedicineTable(medicines) {
    const tbody = $("#medicineTable tbody").empty();

    if (!medicines.length) {
      tbody.append(
        '<tr><td colspan="7" class="text-center text-muted py-3">No medicines found.</td></tr>'
      );
      return;
    }

    const groups = groupMedicines(medicines);

    groups.forEach((group) => {
      group.items.forEach((medicine, index) => {
        const tr = $("<tr></tr>");
        tr.addClass(index === 0 ? "medicine-group-start" : "medicine-brand-row");

        tr.append(`<td>${medicine.id}</td>`);
        tr.append(`<td>${escapeHtml(medicine.medicinename)}</td>`);
        tr.append(`<td>${getTimingInEnglish(medicine)}</td>`);
        tr.append(`<td>${escapeHtml(medicine.quantity || "-")}</td>`);
        tr.append(
          `<td>${
            medicine.durationnumber && medicine.duration
              ? escapeHtml(medicine.durationnumber + " " + medicine.duration)
              : "-"
          }</td>`
        );
        tr.append(`<td>${buildRowActions(medicine.id)}</td>`);

        if (index === 0) {
          tr.append(
            `<td rowspan="${group.items.length}" class="medicine-generic-cell">${buildGenericCell(
              group
            )}</td>`
          );
        }

        tbody.append(tr);
      });
    });
  }

  function loadMedicineTable() {
    window.electronAPI
      .getMedicine()
      .then((medicines) => {
        allMedicinesCache = medicines || [];
        applyMedicineSearch($("#medicineSearch").val());
      })
      .catch(() => {
        $.toast({
          heading: "Error",
          text: "Error fetching data:",
          showHideTransition: "fade",
          icon: "error",
          position: "top-right",
        });
      });
  }

  function getTimingInEnglish(medicine) {
    if (medicine.timingType) {
      return medicine.timingType;
    }

    let timing = "";

    if (medicine.morning === 1) {
      timing += "<span>Morning</span>";
    }

    if (medicine.afternoon === 1) {
      if (timing) timing += " , ";
      timing += "<span>Afternoon</span>";
    }

    if (medicine.night === 1) {
      if (timing) timing += " , ";
      timing += "<span>Night</span>";
    }

    return timing || "-";
  }

  window.deleteMedicine = async function (id, event) {
    event.preventDefault();
    if (!(await common.confirmDelete())) return;

    window.electronAPI.deleteMedicineById(id);
    common.showDeletedSuccessfullyMessage();
    loadPageContent("medicine");
  };

  window.openEditMedicine = function (id, event) {
    event.preventDefault();
    $("#addEditModel").data("id", id);
    $("#addEditModel").removeData("copyFromId");
    $("#addEditModel").load("views/popup/edit-medicine.html");
  };

  window.copyMedicine = function (id, event) {
    event.preventDefault();
    $("#addEditModel").data("id", 0);
    $("#addEditModel").data("copyFromId", id);
    $("#addEditModel").load("views/popup/edit-medicine.html");
  };

  $(document).ready(function () {
    loadMedicineTable();

    $("#medicineSearch").on("input", function () {
      applyMedicineSearch($(this).val());
    });

    $("#btnAddMedicineModal").on("click", function () {
      $("#addEditModel").data("id", 0);
      $("#addEditModel").removeData("copyFromId");
      $("#addEditModel").load("views/popup/edit-medicine.html");
    });
  });
})();

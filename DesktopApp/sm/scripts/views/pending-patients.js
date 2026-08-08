(function () {
  const SORT_FIELDS = ["mr_number", "patient_name", "patient_age", "checkup_date", "is_printed"];

  let pendingTable = null;
  let pendingState = {
    page: 1,
    pageSize: 10,
    sortField: "is_printed",
    sortDir: "desc",
  };

  function resetPendingTableInstance() {
    if ($.fn.DataTable.isDataTable("#pendingPatientTable")) {
      $("#pendingPatientTable").DataTable().clear().destroy();
    }
    pendingTable = null;
  }

  async function migrateLocalStoragePendingPatients() {
    const stored = localStorage.getItem("allPatients");
    if (!stored) return;

    try {
      const allPatients = JSON.parse(stored) || {};
      for (const patient of Object.values(allPatients)) {
        await window.electronAPI.savePendingPatient(patient);
      }
      localStorage.removeItem("allPatients");
    } catch (error) {
      console.error("Failed to migrate pending patients from localStorage:", error);
    }
  }

  function buildPendingPatientRow(patient) {
    return [
      patient.mrNumber || "-",
      patient.patientname,
      patient.patientage,
      patient.checkupDate,
      patient.isPrinted ? "✅" : "❌",
      '<button class="btn btn-warning btn-sm" onclick="openEditPendingPatient(' +
        "'" +
        patient.prescriptionUniqueId +
        "'" +
        ',event)">Update</button>' +
        '<button class="btn btn-danger btn-sm delete-row ms-1" onclick="deletePendingPatient(' +
        "'" +
        patient.prescriptionUniqueId +
        "'" +
        ',event)">Delete</button>',
    ];
  }

  function updateSortIndicators() {
    $("#pendingPatientTable thead th").each(function (index) {
      if (index >= SORT_FIELDS.length) {
        $(this).removeClass("sorting sorting_asc sorting_desc");
        return;
      }

      $(this).addClass("sorting");
      if (SORT_FIELDS[index] === pendingState.sortField) {
        $(this)
          .removeClass("sorting")
          .addClass(pendingState.sortDir === "asc" ? "sorting_asc" : "sorting_desc");
      }
    });
  }

  function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / pendingState.pageSize));
    if (pendingState.page > totalPages) {
      pendingState.page = totalPages;
      return false;
    }

    const start = total === 0 ? 0 : (pendingState.page - 1) * pendingState.pageSize + 1;
    const end = Math.min(pendingState.page * pendingState.pageSize, total);

    $("#pendingPatientsInfo").text(`Showing ${start} to ${end} of ${total} entries`);

    let pagerHtml = "";
    if (pendingState.page > 1) {
      pagerHtml +=
        '<button type="button" class="btn btn-sm btn-light pending-page-btn me-1" data-page="' +
        (pendingState.page - 1) +
        '">Previous</button>';
    }

    if (totalPages <= 10) {
      for (let page = 1; page <= totalPages; page++) {
        pagerHtml +=
          '<button type="button" class="btn btn-sm ' +
          (page === pendingState.page ? "btn-primary" : "btn-light") +
          ' pending-page-btn me-1" data-page="' +
          page +
          '">' +
          page +
          "</button>";
      }
    } else {
      pagerHtml +=
        '<span class="mx-2 align-middle">Page ' +
        pendingState.page +
        " of " +
        totalPages +
        "</span>";
    }

    if (pendingState.page < totalPages) {
      pagerHtml +=
        '<button type="button" class="btn btn-sm btn-light pending-page-btn" data-page="' +
        (pendingState.page + 1) +
        '">Next</button>';
    }

    $("#pendingPatientsPager").html(pagerHtml);
    return true;
  }

  async function loadPendingPatientsTable() {
    const result = await window.electronAPI.getPendingPatients({
      page: pendingState.page,
      pageSize: pendingState.pageSize,
      sortField: pendingState.sortField,
      sortDir: pendingState.sortDir,
    });

    const rows = (result.rows || []).map(buildPendingPatientRow);

    if (!pendingTable) {
      resetPendingTableInstance();
      pendingTable = $("#pendingPatientTable").DataTable({
        paging: false,
        searching: false,
        ordering: false,
        info: false,
      });
    } else {
      pendingTable.clear();
    }

    rows.forEach((row) => pendingTable.row.add(row));
    pendingTable.draw(false);

    const total = parseInt(result.total, 10) || 0;
    if (!renderPagination(total)) {
      return loadPendingPatientsTable();
    }

    updateSortIndicators();
  }

  function bindPendingPatientsEvents() {
    $("#pendingPatientTable thead th").each(function (index) {
      if (index >= SORT_FIELDS.length) return;

      $(this)
        .css("cursor", "pointer")
        .off("click")
        .on("click", function () {
          const field = SORT_FIELDS[index];

          if (pendingState.sortField === field) {
            pendingState.sortDir = pendingState.sortDir === "asc" ? "desc" : "asc";
          } else {
            pendingState.sortField = field;
            pendingState.sortDir = "asc";
          }

          pendingState.page = 1;
          loadPendingPatientsTable().catch(showPendingPatientsError);
        });
    });

    $("#pendingPageSize")
      .val(String(pendingState.pageSize))
      .off("change")
      .on("change", function () {
        pendingState.pageSize = parseInt($(this).val(), 10) || 10;
        pendingState.page = 1;
        loadPendingPatientsTable().catch(showPendingPatientsError);
      });

    $("#pendingPatientsPager")
      .off("click", ".pending-page-btn")
      .on("click", ".pending-page-btn", function () {
        pendingState.page = parseInt($(this).data("page"), 10) || 1;
        loadPendingPatientsTable().catch(showPendingPatientsError);
      });

    $("#btnClearPendingPatientsModal")
      .off("click")
      .on("click", async function () {
        await window.electronAPI.clearPendingPatients();
        pendingState.page = 1;
        common.showDeletedSuccessfullyMessage();
        common.fillPatientCountBubble();
        loadPendingPatientsTable().catch(showPendingPatientsError);
      });
  }

  function showPendingPatientsError() {
    common.showErrorMessage("Error fetching pending patients.");
  }

  function restorePendingPatientsPage() {
    const saved = common.getAndDeletePageNumber();
    if (
      saved.tableId === "pendingPatientTable" &&
      saved.lastSelectedPage !== null &&
      saved.lastSelectedPage !== ""
    ) {
      pendingState.page = Number(saved.lastSelectedPage) + 1;
    }
  }

  async function initPendingPatientsPage() {
    resetPendingTableInstance();
    await migrateLocalStoragePendingPatients();
    restorePendingPatientsPage();
    bindPendingPatientsEvents();
    await loadPendingPatientsTable();
  }

  window.openEditPendingPatient = function (prescriptionUniqueId, event) {
    event.preventDefault();
    common.savePageNumber("pendingPatientTable", pendingState.page - 1);
    $("#content").data("prescriptionUniqueId", prescriptionUniqueId);
    $(".navbar-nav a").removeClass("active-nav");
    $('.navbar-nav a[data-page="home"]').addClass("active-nav");
    $("#addEditModel").html("");
    $("#content").load("./views/home.html");
  };

  window.deletePendingPatient = async function (prescriptionUniqueId, event) {
    event.preventDefault();
    await window.electronAPI.deletePendingPatient(prescriptionUniqueId);
    common.showDeletedSuccessfullyMessage();
    common.fillPatientCountBubble();
    loadPendingPatientsTable().catch(showPendingPatientsError);
  };

  initPendingPatientsPage().catch(showPendingPatientsError);
})();

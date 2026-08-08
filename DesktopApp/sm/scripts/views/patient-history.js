(function () {
  const SORT_FIELDS = [
    "mr_number",
    "patient_name",
    "patient_age",
    "last_visit_date",
    "visit_count",
  ];

  let historyTable = null;
  let historyState = {
    page: 1,
    pageSize: 10,
    sortField: "last_visit_date",
    sortDir: "desc",
  };

  function resetHistoryTableInstance() {
    if ($.fn.DataTable.isDataTable("#patientHistoryTable")) {
      $("#patientHistoryTable").DataTable().clear().destroy();
    }
    historyTable = null;
  }

  function formatDiagnosisSummary(diagnosisList) {
    if (!Array.isArray(diagnosisList) || diagnosisList.length === 0) return "-";
    return diagnosisList.slice(0, 3).join(", ");
  }

  function buildHistoryRow(patient) {
    return [
      patient.mrNumber,
      patient.patientname,
      patient.patientage,
      patient.lastVisitDate,
      patient.visitCount,
      '<button class="btn btn-primary btn-sm" onclick="openNewVisitFromHistory(' +
        "'" +
        patient.mrNumber +
        "'" +
        "," +
        "'" +
        escapeHtmlAttr(patient.patientname) +
        "'" +
        "," +
        "'" +
        escapeHtmlAttr(patient.patientage) +
        "'" +
        ',event)">New Visit</button>' +
        '<button class="btn btn-info btn-sm ms-1" onclick="viewPatientVisits(' +
        "'" +
        patient.mrNumber +
        "'" +
        ',event)">View History</button>',
    ];
  }

  function escapeHtmlAttr(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");
  }

  function updateSortIndicators() {
    $("#patientHistoryTable thead th").each(function (index) {
      if (index >= SORT_FIELDS.length) {
        $(this).removeClass("sorting sorting_asc sorting_desc");
        return;
      }

      $(this).addClass("sorting");
      if (SORT_FIELDS[index] === historyState.sortField) {
        $(this)
          .removeClass("sorting")
          .addClass(historyState.sortDir === "asc" ? "sorting_asc" : "sorting_desc");
      }
    });
  }

  function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / historyState.pageSize));
    if (historyState.page > totalPages) {
      historyState.page = totalPages;
      return false;
    }

    const start = total === 0 ? 0 : (historyState.page - 1) * historyState.pageSize + 1;
    const end = Math.min(historyState.page * historyState.pageSize, total);

    $("#patientHistoryInfo").text(`Showing ${start} to ${end} of ${total} entries`);

    let pagerHtml = "";
    if (historyState.page > 1) {
      pagerHtml +=
        '<button type="button" class="btn btn-sm btn-light history-page-btn me-1" data-page="' +
        (historyState.page - 1) +
        '">Previous</button>';
    }

    if (totalPages <= 10) {
      for (let page = 1; page <= totalPages; page++) {
        pagerHtml +=
          '<button type="button" class="btn btn-sm ' +
          (page === historyState.page ? "btn-primary" : "btn-light") +
          ' history-page-btn me-1" data-page="' +
          page +
          '">' +
          page +
          "</button>";
      }
    } else {
      pagerHtml +=
        '<span class="mx-2 align-middle">Page ' +
        historyState.page +
        " of " +
        totalPages +
        "</span>";
    }

    if (historyState.page < totalPages) {
      pagerHtml +=
        '<button type="button" class="btn btn-sm btn-light history-page-btn" data-page="' +
        (historyState.page + 1) +
        '">Next</button>';
    }

    $("#patientHistoryPager").html(pagerHtml);
    return true;
  }

  async function loadPatientHistoryTable() {
    const result = await window.electronAPI.getPatientHistory({
      page: historyState.page,
      pageSize: historyState.pageSize,
      sortField: historyState.sortField,
      sortDir: historyState.sortDir,
    });

    const rows = (result.rows || []).map(buildHistoryRow);

    if (!historyTable) {
      resetHistoryTableInstance();
      historyTable = $("#patientHistoryTable").DataTable({
        paging: false,
        searching: false,
        ordering: false,
        info: false,
      });
    } else {
      historyTable.clear();
    }

    rows.forEach((row) => historyTable.row.add(row));
    historyTable.draw(false);

    const total = parseInt(result.total, 10) || 0;
    if (!renderPagination(total)) {
      return loadPatientHistoryTable();
    }

    updateSortIndicators();
  }

  function bindHistoryEvents() {
    $("#patientHistoryTable thead th").each(function (index) {
      if (index >= SORT_FIELDS.length) return;

      $(this)
        .css("cursor", "pointer")
        .off("click")
        .on("click", function () {
          const field = SORT_FIELDS[index];

          if (historyState.sortField === field) {
            historyState.sortDir = historyState.sortDir === "asc" ? "desc" : "asc";
          } else {
            historyState.sortField = field;
            historyState.sortDir = "asc";
          }

          historyState.page = 1;
          loadPatientHistoryTable().catch(showHistoryError);
        });
    });

    $("#historyPageSize")
      .val(String(historyState.pageSize))
      .off("change")
      .on("change", function () {
        historyState.pageSize = parseInt($(this).val(), 10) || 10;
        historyState.page = 1;
        loadPatientHistoryTable().catch(showHistoryError);
      });

    $("#patientHistoryPager")
      .off("click", ".history-page-btn")
      .on("click", ".history-page-btn", function () {
        historyState.page = parseInt($(this).data("page"), 10) || 1;
        loadPatientHistoryTable().catch(showHistoryError);
      });
  }

  function showHistoryError() {
    common.showErrorMessage("Error fetching patient history.");
  }

  window.openNewVisitFromHistory = function (mrNumber, patientname, patientage, event) {
    event.preventDefault();
    $("#content").data("historyPatient", {
      mrNumber: mrNumber,
      patientname: patientname,
      patientage: patientage,
    });
    $(".navbar-nav a").removeClass("active-nav");
    $('.navbar-nav a[data-page="home"]').addClass("active-nav");
    $("#addEditModel").html("");
    $("#content").load("./views/home.html");
  };

  window.viewPatientVisits = async function (mrNumber, event) {
    event.preventDefault();

    try {
      const visits = await window.electronAPI.getPatientVisits(mrNumber);
      if (!visits.length) {
        Swal.fire("No visits", "No visit records found for this patient.", "info");
        return;
      }

      let rowsHtml = visits
        .map(
          (visit) =>
            `<tr>
              <td>${visit.visitDate || "-"}</td>
              <td>${visit.patientAge || "-"}</td>
              <td>${formatDiagnosisSummary(visit.diagnosis)}</td>
              <td><button type="button" class="btn btn-sm btn-secondary" onclick="viewVisitDetail(${visit.id})">Details</button></td>
            </tr>`
        )
        .join("");

      Swal.fire({
        title: `Visit History — ${mrNumber}`,
        width: 800,
        html:
          '<div class="table-responsive"><table class="table table-sm table-bordered">' +
          "<thead><tr><th>Date</th><th>Age</th><th>Diagnosis</th><th></th></tr></thead>" +
          `<tbody>${rowsHtml}</tbody></table></div>`,
        confirmButtonText: "Close",
      });
    } catch (error) {
      showHistoryError();
    }
  };

  window.viewVisitDetail = async function (visitId) {
    try {
      const visit = await window.electronAPI.getPatientVisitById(visitId);
      if (!visit) {
        Swal.fire("Not found", "Visit record not found.", "warning");
        return;
      }

      const medicineLines = (visit.medicines || [])
        .map((m) => m.medicinename)
        .filter(Boolean)
        .slice(0, 10)
        .join(", ");

      Swal.fire({
        title: `${visit.mrNumber} — ${visit.visitDate}`,
        width: 700,
        html: `
          <p><strong>Age:</strong> ${visit.patientAge || "-"}</p>
          <p><strong>Diagnosis:</strong> ${(visit.diagnosis || []).join(", ") || "-"}</p>
          <p><strong>Complaints:</strong> ${(visit.complaints || []).map((c) => c.complaint).filter(Boolean).join(", ") || "-"}</p>
          <p><strong>Medicines:</strong> ${medicineLines || "-"}</p>
          <p><strong>GCS / BP:</strong> ${visit.clinicalExam?.gcs || "-"} / ${visit.clinicalExam?.bp || "-"}</p>
          <p><strong>Follow up:</strong> ${visit.followupDuration || "-"} ${visit.followupUnit || ""}</p>
        `,
        confirmButtonText: "Close",
      });
    } catch (error) {
      showHistoryError();
    }
  };

  async function initPatientHistoryPage() {
    resetHistoryTableInstance();
    bindHistoryEvents();
    await loadPatientHistoryTable();
  }

  initPatientHistoryPage().catch(showHistoryError);
})();

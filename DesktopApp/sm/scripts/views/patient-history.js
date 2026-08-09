(function () {
  const SORT_FIELDS = [
    "mr_number",
    "patient_name",
    "patient_age",
    "last_visit_date",
    "visit_count",
  ];

  let historyTable = null;
  let searchDebounceTimer = null;
  let historyState = {
    page: 1,
    pageSize: 10,
    sortField: "last_visit_date",
    sortDir: "desc",
    search: "",
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

  function escapeHtml(value) {
    return common.escapeHtml(value);
  }

  function escapeHtmlAttr(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");
  }

  function displayValue(value) {
    const text = String(value ?? "").trim();
    return text ? escapeHtml(text) : '<span class="text-muted">-</span>';
  }

  function buildVisitDetailSection(title, bodyHtml) {
    if (!bodyHtml) {
      return "";
    }

    return (
      '<div class="visit-detail-section mb-3">' +
      '<div class="visit-detail-section-title">' +
      escapeHtml(title) +
      "</div>" +
      '<div class="visit-detail-section-body">' +
      bodyHtml +
      "</div></div>"
    );
  }

  function formatComorbidities(comorbidities) {
    if (!comorbidities || typeof comorbidities !== "object") {
      return "";
    }

    const labels = {
      dm: "DM",
      htn: "HTN",
      cva: "CVA",
      cad: "CAD",
      hepatitis: "HEPATITIS",
      trauma: "TRAUMA",
    };

    const items = Object.entries(labels)
      .map(([key, label]) => {
        const positive = !!comorbidities[key];
        return (
          '<span class="visit-detail-chip ' +
          (positive ? "visit-detail-chip-positive" : "visit-detail-chip-negative") +
          '">' +
          escapeHtml(label) +
          " " +
          (positive ? "+VE" : "-VE") +
          "</span>"
        );
      })
      .join("");

    return items ? '<div class="visit-detail-chip-row">' + items + "</div>" : "";
  }

  function formatComplaints(complaints) {
    if (!Array.isArray(complaints) || complaints.length === 0) {
      return "";
    }

    const rows = complaints
      .filter((item) => item?.complaint)
      .map((item) => {
        let duration = "";
        if (item.duration && item.unit && item.duration !== "0" && item.duration !== 0) {
          const unit = item.duration === "1" || item.duration === 1 ? item.unit : item.unit + "s";
          duration = ` <span class="text-muted">(${escapeHtml(item.duration)} ${escapeHtml(unit)})</span>`;
        }

        return (
          "<li>" + escapeHtml(item.complaint) + duration + "</li>"
        );
      });

    return rows.length ? '<ul class="visit-detail-list mb-0">' + rows.join("") + "</ul>" : "";
  }

  function formatClinicalExam(exam) {
    if (!exam || typeof exam !== "object") {
      return "";
    }

    const rows = [
      ["GCS", exam.gcs ? `${exam.gcs}/15` : ""],
      ["BP", exam.bp],
      ["Power UL", [exam.powerUL1, exam.powerUL2].filter(Boolean).join(" / ")],
      ["Power LL", [exam.powerLL1, exam.powerLL2].filter(Boolean).join(" / ")],
      ["Sensations", exam.sensations],
      ["Reflexes", exam.reflexes],
      ["SLR", exam.slr],
      ["Sphincter", exam.sphincter],
      ["Faber", exam.feber],
      ["Phalen Sign", exam.PHALLENSIGN ? "+VE" : exam.PHALLENSIGN === false ? "-VE" : ""],
      ["Tinnel Sign", exam.TINNELSIGN ? "+VE" : exam.TINNELSIGN === false ? "-VE" : ""],
      ["Sperling Sign", exam.SPERLINGSIGN ? "+VE" : exam.SPERLINGSIGN === false ? "-VE" : ""],
      ["Hoff Sign", exam.HOFFSIGN ? "+VE" : exam.HOFFSIGN === false ? "-VE" : ""],
    ].filter(([, value]) => String(value ?? "").trim());

    if (!rows.length) {
      return "";
    }

    return (
      '<div class="row g-2">' +
      rows
        .map(
          ([label, value]) =>
            '<div class="col-md-4 col-sm-6">' +
            '<div class="visit-detail-kv"><span class="visit-detail-kv-label">' +
            escapeHtml(label) +
            '</span><span class="visit-detail-kv-value">' +
            displayValue(value) +
            "</span></div></div>"
        )
        .join("") +
      "</div>"
    );
  }

  function formatDiagnosisList(diagnosis) {
    if (!Array.isArray(diagnosis) || diagnosis.length === 0) {
      return "";
    }

    return (
      '<ul class="visit-detail-list mb-0">' +
      diagnosis.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") +
      "</ul>"
    );
  }

  function formatInvestigations(investigations, investigationDetail) {
    let html = "";

    if (Array.isArray(investigations) && investigations.length > 0) {
      const names = investigations
        .map((item) => (Array.isArray(item) ? item[0] : item))
        .filter(Boolean);

      if (names.length) {
        html +=
          '<ul class="visit-detail-list mb-2">' +
          names.map((name) => "<li>" + escapeHtml(name) + "</li>").join("") +
          "</ul>";
      }
    }

    if (investigationDetail && String(investigationDetail).trim()) {
      html +=
        '<div class="visit-detail-note"><strong>Details:</strong> ' +
        displayValue(investigationDetail) +
        "</div>";
    }

    return html;
  }

  function formatPlan(plan) {
    if (!Array.isArray(plan) || plan.length === 0) {
      return "";
    }

    return (
      '<ul class="visit-detail-list mb-0">' +
      plan.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") +
      "</ul>"
    );
  }

  function formatMedicineTimings(medicine) {
    if (medicine.timingType) {
      return medicine.timingType;
    }

    const parts = [];
    if (medicine.morning) parts.push("Morning");
    if (medicine.afternoon) parts.push("Afternoon");
    if (medicine.night) parts.push("Night");
    return parts.join(", ");
  }

  function formatMedicineDuration(medicine) {
    if (!medicine.durationnumber || !medicine.duration) {
      return "";
    }

    const number = medicine.durationnumber;
    const unit = medicine.duration;
    const suffix =
      number === "1" || number === 1 ? unit : String(unit).endsWith("s") ? unit : unit + "s";
    return `${number} ${suffix}`;
  }

  function formatMedicines(medicines) {
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return "";
    }

    const rows = medicines
      .filter((medicine) => medicine?.medicinename)
      .map((medicine) => {
        const brandName = common.normalizeMedicineBrandName(medicine.medicinename);
        const genericName = medicine.medicinegenericname || "";
        const timings = formatMedicineTimings(medicine);
        const duration = formatMedicineDuration(medicine);
        const extra = medicine.moredetail ? `<div class="visit-detail-subtext">${escapeHtml(medicine.moredetail)}</div>` : "";

        return (
          "<tr>" +
          "<td><strong>" +
          escapeHtml(brandName) +
          "</strong>" +
          (genericName
            ? '<div class="visit-detail-subtext">' + escapeHtml(genericName) + "</div>"
            : "") +
          extra +
          "</td>" +
          "<td>" +
          displayValue(medicine.medicinetype) +
          "</td>" +
          "<td>" +
          displayValue(timings) +
          "</td>" +
          "<td>" +
          displayValue(duration) +
          "</td>" +
          "<td>" +
          displayValue(medicine.quantity) +
          "</td></tr>"
        );
      });

    if (!rows.length) {
      return "";
    }

    return (
      '<div class="table-responsive">' +
      '<table class="table table-sm table-bordered visit-detail-table mb-0">' +
      "<thead><tr><th>Medicine</th><th>Type</th><th>Timings</th><th>Duration</th><th>Qty</th></tr></thead>" +
      "<tbody>" +
      rows.join("") +
      "</tbody></table></div>"
    );
  }

  function formatRehabilitationAids(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return "";
    }

    return (
      '<ul class="visit-detail-list mb-0">' +
      items
        .filter((item) => item?.name)
        .map((item) => {
          const detail = item.moreDetail
            ? ' <span class="text-muted">- ' + escapeHtml(item.moreDetail) + "</span>"
            : "";
          return "<li>" + escapeHtml(item.name) + detail + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }

  function formatPatientInstructions(instructions) {
    if (!Array.isArray(instructions) || instructions.length === 0) {
      return "";
    }

    return instructions
      .filter((item) => item?.title || item?.detail)
      .map(
        (item) =>
          '<div class="visit-detail-instruction mb-2">' +
          (item.title ? "<strong>" + escapeHtml(item.title) + "</strong>" : "") +
          (item.detail ? '<div class="visit-detail-subtext">' + escapeHtml(item.detail) + "</div>" : "") +
          "</div>"
      )
      .join("");
  }

  function formatSurgery(surgery) {
    if (!surgery || typeof surgery !== "object") {
      return "";
    }

    const procedures = [];
    if (surgery.laminectomy) procedures.push("Laminectomy");
    if (surgery.tpf) procedures.push("TPF");
    if (surgery.craniotomy) procedures.push("Craniotomy");
    if (surgery.vpshunt) procedures.push("VP Shunt");
    if (surgery.mmc) procedures.push("MMC");

    let html = "";
    if (procedures.length) {
      html +=
        '<div class="mb-2"><strong>Procedures:</strong> ' +
        escapeHtml(procedures.join(", ")) +
        "</div>";
    }

    if (surgery.unitsurgery || surgery.durationsurgery) {
      html +=
        '<div class="mb-2"><strong>Post-op duration:</strong> ' +
        displayValue(
          [surgery.durationsurgery, surgery.unitsurgery].filter(Boolean).join(" ")
        ) +
        "</div>";
    }

    if (surgery.patientSurgeryFurtherDetail) {
      html +=
        '<div class="visit-detail-note">' +
        displayValue(surgery.patientSurgeryFurtherDetail) +
        "</div>";
    }

    return html;
  }

  function formatFollowUp(duration, unit) {
    if (!duration && !unit) {
      return "";
    }

    return displayValue([duration, unit].filter(Boolean).join(" "));
  }

  function buildVisitDetailHtml(visit) {
    const sections = [
      buildVisitDetailSection("Comorbidities", formatComorbidities(visit.comorbidities)),
      buildVisitDetailSection("Chief Complaints", formatComplaints(visit.complaints)),
      buildVisitDetailSection("Clinical Examination", formatClinicalExam(visit.clinicalExam)),
      buildVisitDetailSection("Diagnosis", formatDiagnosisList(visit.diagnosis)),
      buildVisitDetailSection(
        "Investigations",
        formatInvestigations(visit.investigations, visit.investigationDetail)
      ),
      buildVisitDetailSection("Plan", formatPlan(visit.plan)),
      buildVisitDetailSection("Medicines", formatMedicines(visit.medicines)),
      buildVisitDetailSection(
        "Rehabilitation Aids",
        formatRehabilitationAids(visit.rehabilitationAids)
      ),
      buildVisitDetailSection(
        "Patient Instructions",
        formatPatientInstructions(visit.patientInstructions)
      ),
      buildVisitDetailSection("Surgery / Post-op", formatSurgery(visit.surgery)),
      buildVisitDetailSection(
        "Follow Up",
        formatFollowUp(visit.followupDuration, visit.followupUnit)
      ),
    ].filter(Boolean);

    return (
      '<style>' +
      ".visit-detail-wrap{max-height:70vh;overflow-y:auto;text-align:left;padding-right:4px;}" +
      ".visit-detail-header{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;}" +
      ".visit-detail-header-item{min-width:120px;}" +
      ".visit-detail-header-label{display:block;font-size:12px;color:#6c757d;text-transform:uppercase;letter-spacing:.03em;}" +
      ".visit-detail-header-value{font-size:15px;font-weight:600;color:#212529;}" +
      ".visit-detail-section{border:1px solid #e9ecef;border-radius:8px;overflow:hidden;}" +
      ".visit-detail-section-title{background:#eef2f7;padding:8px 12px;font-weight:600;font-size:14px;border-bottom:1px solid #e9ecef;}" +
      ".visit-detail-section-body{padding:12px;}" +
      ".visit-detail-list{padding-left:18px;margin-bottom:0;}" +
      ".visit-detail-list li{margin-bottom:4px;}" +
      ".visit-detail-chip-row{display:flex;flex-wrap:wrap;gap:8px;}" +
      ".visit-detail-chip{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600;}" +
      ".visit-detail-chip-positive{background:#d1e7dd;color:#0f5132;}" +
      ".visit-detail-chip-negative{background:#f8f9fa;color:#495057;border:1px solid #dee2e6;}" +
      ".visit-detail-kv{background:#f8f9fa;border:1px solid #edf0f2;border-radius:6px;padding:8px;height:100%;}" +
      ".visit-detail-kv-label{display:block;font-size:11px;color:#6c757d;text-transform:uppercase;margin-bottom:2px;}" +
      ".visit-detail-kv-value{font-size:13px;font-weight:600;color:#212529;}" +
      ".visit-detail-subtext{font-size:12px;color:#6c757d;margin-top:2px;}" +
      ".visit-detail-note{font-size:13px;line-height:1.5;}" +
      ".visit-detail-table th{font-size:12px;white-space:nowrap;}" +
      ".visit-detail-instruction{padding:8px 10px;background:#f8f9fa;border-radius:6px;}" +
      "</style>" +
      '<div class="visit-detail-wrap">' +
      '<div class="visit-detail-header">' +
      '<div class="visit-detail-header-item"><span class="visit-detail-header-label">MR Number</span><span class="visit-detail-header-value">' +
      displayValue(visit.mrNumber) +
      '</span></div><div class="visit-detail-header-item"><span class="visit-detail-header-label">Visit Date</span><span class="visit-detail-header-value">' +
      displayValue(visit.visitDate) +
      '</span></div><div class="visit-detail-header-item"><span class="visit-detail-header-label">Age</span><span class="visit-detail-header-value">' +
      displayValue(visit.patientAge) +
      "</span></div></div>" +
      (sections.length ? sections.join("") : '<p class="text-muted mb-0">No detailed visit data saved.</p>') +
      "</div>"
    );
  }

  function updateSortIndicators() {
    $("#patientHistoryTable thead th").each(function (index) {
      const $th = $(this);
      $th.removeClass("sorting sorting_asc sorting_desc");

      if (index >= SORT_FIELDS.length) {
        return;
      }

      if (SORT_FIELDS[index] === historyState.sortField) {
        $th.addClass(historyState.sortDir === "asc" ? "sorting_asc" : "sorting_desc");
      } else {
        $th.addClass("sorting");
      }
    });
  }

  function buildPageButton(page, currentPage) {
    return (
      '<button type="button" class="btn btn-sm ' +
      (page === currentPage ? "btn-primary" : "btn-light") +
      ' history-page-btn me-1" data-page="' +
      page +
      '">' +
      page +
      "</button>"
    );
  }

  function buildPageNumberButtons(currentPage, totalPages) {
    if (totalPages <= 10) {
      let html = "";
      for (let page = 1; page <= totalPages; page++) {
        html += buildPageButton(page, currentPage);
      }
      return html;
    }

    let html = buildPageButton(1, currentPage);
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);

    if (start > 2) {
      html += '<span class="mx-1 align-middle">...</span>';
    }

    for (let page = start; page <= end; page++) {
      html += buildPageButton(page, currentPage);
    }

    if (end < totalPages - 1) {
      html += '<span class="mx-1 align-middle">...</span>';
    }

    html += buildPageButton(totalPages, currentPage);
    return html;
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

    pagerHtml += buildPageNumberButtons(historyState.page, totalPages);

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
      search: historyState.search,
    });

    const rows = (result.rows || []).map(buildHistoryRow);

    if (!historyTable) {
      resetHistoryTableInstance();
      historyTable = $("#patientHistoryTable").DataTable({
        paging: false,
        searching: false,
        ordering: false,
        info: false,
        order: [],
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
        .on("click", function (event) {
          event.preventDefault();
          event.stopImmediatePropagation();

          const field = SORT_FIELDS[index];

          if (historyState.sortField === field) {
            historyState.sortDir = historyState.sortDir === "asc" ? "desc" : "asc";
          } else {
            historyState.sortField = field;
            historyState.sortDir = "asc";
          }

          historyState.page = 1;
          updateSortIndicators();
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

    $("#historySearch")
      .val(historyState.search)
      .off("input")
      .on("input", function () {
        clearTimeout(searchDebounceTimer);
        const value = $(this).val();
        searchDebounceTimer = setTimeout(() => {
          historyState.search = value;
          historyState.page = 1;
          loadPatientHistoryTable().catch(showHistoryError);
        }, 300);
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

      Swal.fire({
        title: "Visit Details",
        width: 920,
        html: buildVisitDetailHtml(visit),
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

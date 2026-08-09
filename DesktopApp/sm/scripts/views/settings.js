$(document).ready(function () {
    $("#addTranslationsBtn").on("click", function (event) {
      event.preventDefault();
      addTranslationsRow();
    });

    $(document).on("input", ".translations-input", function () {
      const selectedTranslations = $(this).val();
      const translationsRow = $(this).closest("tr");

      if (translationsData[selectedTranslations]) {
        const translationsDetails = translationsData[selectedTranslations];

        translationsRow
          .find("[id^='english']")
          .val(translationsDetails.english);
        translationsRow.find("[id^='tourdu']").val(translationsDetails.tourdu);
      }
    });

    $(document)
      .off("click", ".remove-translations")
      .on("click", ".remove-translations", async function () {
        const $row = $(this).closest("tr");
        const isLastRow = $("#translationsContainer .translations-row").length <= 1;

        if (
          !(await common.confirmDelete({
            title: isLastRow ? "Clear translation?" : "Remove translation row?",
            text: isLastRow
              ? "The translation fields on this row will be cleared."
              : "This translation row will be removed.",
            confirmButtonText: isLastRow ? "Yes, clear it!" : "Yes, remove it!",
          }))
        ) {
          return;
        }

        if (!isLastRow) {
          $row.remove();
        } else {
          $row.find("[id^='english']").val("");
          $row.find("[id^='tourdu']").val("");
        }
      });

    $("#settingForm").on("submit", async function (event) {
      event.preventDefault(); // Prevent the default form submission
      // Object to store settings
      const settings = {
        defaultDay: $("#selectDefaultDay").val(),
        defaultDate: $("#txtDefaultDate").val(),
        defaultcomplaintunit: $(".default-complaint-unit").val(),
        defaultcomplaintduration: $(
          "#txtDefaultComplaintDurationSetting"
        ).val(),

        defaultfollowupunit: $(".default-followup-unit").val(),
        defaultfollowupduration: $("#txtDefaultFollowUpDurationSetting").val(),

        investigationDetailValues: $("#txtboxInvestigationDetailValues").val(),
        surgeryDetailValues: $("#txtboxSurgeryDetailValues").val(),

        defaultPrescriptionPrinterName: $(
          "#txtDefaultPrescriptionPrinterName"
        ).val(),
        defaultThermalPrinterName: $("#txtDefaultThermalPrinterName").val(),
        alwaysAskCredentials: $("#chkAlwaysAskCredentials").is(":checked")
          ? 1
          : 0,
        appZoomLevel: Number($("#selectAppZoomLevel").val()) || 100,
        patientHistoryRetention:
          Number($("#txtPatientHistoryRetention").val()) || 3,
      };

      // Array to store translations data
      const translations = [];
      $("#translationsContainer .translations-row").each(function () {
        const english = $(this).find(".english-input").val();
        const tourdu = $(this).find(".tourdu-input").val();

        // Push data as an object into the translations array
        translations.push({ english, tourdu });
      });

      // Combine both into a single object (optional)
      const formData = {
        settings,
        translations,
      };

      try {
        // Await both async operations
        await updateSettings(
          settings.defaultDate,
          settings.defaultDay,
          settings.defaultcomplaintunit,
          settings.defaultcomplaintduration,
          settings.defaultfollowupunit,
          settings.defaultfollowupduration,
          settings.investigationDetailValues,
          settings.surgeryDetailValues,
          settings.defaultPrescriptionPrinterName,
          settings.defaultThermalPrinterName,
          settings.alwaysAskCredentials,
          settings.appZoomLevel,
          settings.patientHistoryRetention
        );
        await savetranslations(translations);
        await common.refreshSettings();
        await common.applyAppZoom();
        // Show success message after both are completed
        common.showUpdatedSuccessfullyMessage();
      } catch (error) {
        console.error("Error updating settings or translations:", error);
        // Handle errors, such as showing a message to the user
      }
    });
    init();
    loadDatabaseFreeSpaceInfo();

    $("#btnCompactDatabase")
      .off("click")
      .on("click", async function () {
        const confirm = await Swal.fire({
          title: "Clean database file?",
          text: "This compacts the database and reclaims unused space. It may take a moment on large files.",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes, clean it",
          cancelButtonText: "Cancel",
        });

        if (!confirm.isConfirmed) return;

        Swal.fire({
          title: "Cleaning...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        try {
          const result = await window.electronAPI.compactDatabase();
          const reclaimedMb = ((result.freeBytes || 0) / (1024 * 1024)).toFixed(1);
          await Swal.fire({
            title: result.vacuumed ? "Done" : "Already compact",
            text: result.vacuumed
              ? `Reclaimed ~${reclaimedMb} MB of disk space.`
              : "No significant unused space was found.",
            icon: "success",
          });
          loadDatabaseFreeSpaceInfo();
        } catch (error) {
          Swal.fire({
            title: "Failed",
            text: error.message || "Could not compact the database.",
            icon: "error",
          });
        }
      });
  });

  function addTranslationsRow() {
    const newRow = $("#translationsContainer .translations-row:first").clone();
    const rowIndex = $("#translationsContainer .translations-row").length;
    newRow.find("input").val(""); // Clear input values

    // Update dynamic IDs for the new row
    newRow
      .find(".translations-input")
      .attr("id", `translations-input-${rowIndex}`);
    newRow.find(".english-input").attr("id", `english-${rowIndex}`);
    newRow.find(".tourdu-input").attr("id", `tourdu-${rowIndex}`);

    // Append the new row
    $("#translationsContainer tbody").append(newRow);
  }

  async function init() {
    await getSettings();
    await getTranslations();
  }

  async function loadDatabaseFreeSpaceInfo() {
    try {
      const { freeBytes } = await window.electronAPI.getDatabaseFreeSpace();
      const freeMb = (freeBytes / (1024 * 1024)).toFixed(1);
      if (freeBytes >= 1024 * 1024) {
        $("#databaseFreeSpaceInfo").text(`Reclaimable space: ~${freeMb} MB`);
      } else {
        $("#databaseFreeSpaceInfo").text("Database file is already compact.");
      }
    } catch (error) {
      $("#databaseFreeSpaceInfo").text("");
    }
  }

  async function getSettings() {
    await common.refreshSettings();
    const setting = common.getSettings();
    if (setting && setting.length > 0) {
      $("#txtDefaultDate").datepicker({
        dateFormat: "dd/mm/yy", //check change
        changeMonth: true,
        changeYear: true,
      });
      $("#txtDefaultDate").datepicker("setDate", setting[0].defaultdate);

      $("#selectDefaultDay").val(setting[0].defaultday);
      $(".default-complaint-unit").val(setting[0].defaultcomplaintunit);
      $("#txtDefaultComplaintDurationSetting").val(
        setting[0].defaultcomplaintduration
      );

      $(".default-followup-unit").val(setting[0].defaultfollowupunit);
      $("#txtDefaultFollowUpDurationSetting").val(
        setting[0].defaultfollowupduration
      );

      $("#txtboxInvestigationDetailValues").val(
        setting[0].investigationDetailValues
      );
      $("#txtboxSurgeryDetailValues").val(setting[0].surgeryDetailValues);
      $("#txtDefaultPrescriptionPrinterName").val(
        setting[0].defaultPrescriptionPrinterName
      );
      $("#txtDefaultThermalPrinterName").val(
        setting[0].defaultThermalPrinterName
      );

      $("#chkAlwaysAskCredentials").prop(
        "checked",
        setting[0].alwaysAskCredentials !== 0
      );

      const zoomLevel = setting[0].appZoomLevel || 100;
      $("#selectAppZoomLevel").val(String(zoomLevel));

      $("#txtPatientHistoryRetention").val(
        String(setting[0].patientHistoryRetention || 3)
      );

      if (setting[0].defaultdate)
        toggleInputs("txtDefaultDate", "selectDefaultDay");
      else toggleInputs("selectDefaultDay", "txtDefaultDate");
    }
  }

  async function getTranslations() {
    await common.refreshTranslations();
    const translations = common.getTranslations();
    // Clear the current rows in the table body
    $("#translationsContainer tbody").empty();

    // Iterate over the translations and create rows
    if (translations && translations.length > 0) {
      translations.forEach((translation, index) => {
        const newRow = `
        <tr class="translations-row">
          <td>
            <input
              type="text"
              class="form-control english-input"
              id="english-${index}"
              value="${translation.english || ""}"
              placeholder="Enter English"
              required
            />
          </td>
          <td>
            <input
              type="text"
              class="form-control tourdu-input"
              id="tourdu-${index}"
              value="${translation.tourdu || ""}"
              placeholder="اردو داخل کریں"
            />
          </td>
          <td>
            <button
              type="button"
              class="btn btn-danger remove-translations"
            >
              Remove
            </button>
          </td>
        </tr>`;
        $("#translationsContainer tbody").append(newRow);
      });
    }
  }

  async function updateSettings(
    defaultdate,
    defaultday,
    defaultcomplaintunit,
    defaultcomplaintduration,
    defaultfollowupunit,
    defaultfollowupduration,
    investigationDetailValues,
    surgeryDetailValues,
    defaultPrescriptionPrinterName,
    defaultThermalPrinterName,
    alwaysAskCredentials,
    appZoomLevel,
    patientHistoryRetention
  ) {
    const results = await window.electronAPI.updateSettings(
      defaultdate,
      defaultday,
      defaultcomplaintunit,
      defaultcomplaintduration,
      defaultfollowupunit,
      defaultfollowupduration,
      investigationDetailValues,
      surgeryDetailValues,
      defaultPrescriptionPrinterName,
      defaultThermalPrinterName,
      alwaysAskCredentials,
      appZoomLevel,
      patientHistoryRetention
    );
  }

  async function savetranslations(translations) {
    const results = await window.electronAPI.savetranslations(translations);
  }

  function toggleInputs(changedInputId, otherInputId) {
    const changedInput = document.getElementById(changedInputId);
    const otherInput = document.getElementById(otherInputId);

    // Disable the other input if the current input has a value
    if (changedInput.value) {
      otherInput.disabled = true;
    } else {
      otherInput.disabled = false; // Re-enable the other input if the current one is cleared
    }
  }

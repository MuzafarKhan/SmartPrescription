function plainMedicineName(name) {
  return common.normalizeMedicineBrandName(name);
}

$(document).ready(async function () {
    const prescriptionData = JSON.parse(
      $("#addEditModel").data("prescriptionData")
    );
    const quickPrint = $("#addEditModel").data("quickPrint");
    const isPrintPrescription = $("#addEditModel").data("isPrintPrescription");
    const shouldReloadHomeAfterPrint = !!$("#addEditModel").data(
      "shouldReloadHomeAfterPrint"
    );
    const shouldCompleteOnPrint = !!$("#addEditModel").data("shouldCompleteOnPrint");
    let homeReloadDone = false;
    let prescriptionPrinted = false;
    let prescriptionCompleted = !!$("#addEditModel").data("prescriptionCompleted");

    $("#addEditModel").data("quickPrint", false);
    $("#addEditModel").data("isPrintPrescription", false);
    $("#addEditModel").data("shouldReloadHomeAfterPrint", false);
    $("#addEditModel").data("shouldCompleteOnPrint", false);
    $("#addEditModel").data("prescriptionPrinted", false);

    async function finalizePrescriptionAfterPrint() {
      if (!shouldCompleteOnPrint || prescriptionCompleted) {
        return;
      }

      try {
        const result = await window.electronAPI.completePrescription(prescriptionData);
        prescriptionCompleted = true;
        $("#addEditModel").data("prescriptionCompleted", true);
        if (result?.mrNumber) {
          prescriptionData.patientInformation.mrNumber = result.mrNumber;
          $("#addEditModel").data(
            "prescriptionData",
            JSON.stringify(prescriptionData)
          );
        }
        common.fillPatientCountBubble();
      } catch (error) {
        console.error("Failed to complete prescription:", error);
        common.showErrorMessage(
          "Failed to save patient history. Please try again."
        );
        throw error;
      }
    }

    function markPrescriptionPrinted() {
      prescriptionPrinted = true;
      $("#addEditModel").data("prescriptionPrinted", true);
    }

    function wasPrescriptionPrinted() {
      return prescriptionPrinted || !!$("#addEditModel").data("prescriptionPrinted");
    }

    function reloadPrescriptionHomePage() {
      $("#addEditModel").html("");
      $("#addEditModel").removeData("prescriptionData");
      $("#addEditModel").removeData("quickPrint");
      $("#addEditModel").removeData("isPrintPrescription");
      $("#addEditModel").removeData("shouldReloadHomeAfterPrint");
      $("#addEditModel").removeData("shouldCompleteOnPrint");
      $("#addEditModel").removeData("prescriptionCompleted");
      $("#addEditModel").removeData("prescriptionPrinted");
      delete window.finalizePrescriptionAfterPrintFromPopup;
      delete window.markPrescriptionPrintedFromPopup;
      common.fillPatientCountBubble();
      $("#content").load("./views/home.html");
    }

    function maybeReloadHomePage() {
      if (!shouldReloadHomeAfterPrint || homeReloadDone || !wasPrescriptionPrinted()) {
        return;
      }
      homeReloadDone = true;
      reloadPrescriptionHomePage();
    }

    $("#addAttachpatientinstruction")
      .off("hidden.bs.modal.reloadHome")
      .on("hidden.bs.modal.reloadHome", function () {
        $(this).off("keydown");
        maybeReloadHomePage();
      });

    window.finalizePrescriptionAfterPrintFromPopup = finalizePrescriptionAfterPrint;
    window.markPrescriptionPrintedFromPopup = markPrescriptionPrinted;

    await init(prescriptionData, isPrintPrescription);

    var defaultPrescriptionPrinterName =
      common.getSettings()[0].defaultPrescriptionPrinterName;
    var defaultThermalPrinterName =
      common.getSettings()[0].defaultThermalPrinterName;
    if (quickPrint) {
      if (isPrintPrescription) {
        if (!defaultPrescriptionPrinterName) {
          common.showErrorMessage(
            "Please set default prescription printer in setting page"
          );
          return;
        }
      } else {
        if (!defaultThermalPrinterName) {
          common.showErrorMessage(
            "Please set default thermal printer in setting page"
          );
          return;
        }
      }

      $("#addAttachpatientinstruction").modal("show");

      // Wait for modal to be fully shown
      await new Promise((resolve) => {
        $("#addAttachpatientinstruction").on("shown.bs.modal", resolve);
      });

      try {
        if (isPrintPrescription) {
          await printPrescriptionDirectly(defaultPrescriptionPrinterName);
        } else {
          await printOnThermalDirectly(
            defaultThermalPrinterName,
            prescriptionData
          );
        }

        await finalizePrescriptionAfterPrint();
        markPrescriptionPrinted();
        $("#addAttachpatientinstruction").modal("hide");
        $("body").removeClass("modal-open");
        $(".modal-backdrop").remove();
        maybeReloadHomePage();
      } catch (error) {
        console.error("Quick print flow failed:", error);
      }
    } else {
      $("#addAttachpatientinstruction").modal("show");
      $(".modal-dialog").addClass("width-for-print");
    }

    if (!$("#printableafterGap").html()) {
      await new Promise((resolve) => {
        $("#addAttachpatientinstruction").on("shown.bs.modal", resolve);
      });
      $("#addAttachpatientinstruction").modal("hide");
      $("body").removeClass("modal-open");
      $(".modal-backdrop").remove();
    }
    // Add CSS for bold values
    $("<style>")
      .prop("type", "text/css")
      .html(".bold-value { font-weight: bold !important; }")
      .appendTo("head");

    $("#addAttachpatientinstruction")
      .on("shown.bs.modal", function () {
        $(this).on("keydown", function (e) {
          if (e.ctrlKey && (e.key === "p" || e.keyCode === 80)) {
            e.preventDefault();
            printPrescription().catch(() => {});
            return;
          }
          if (e.key === "Enter" || e.keyCode === 13) {
            printPrescription().catch(() => {});
            e.preventDefault();
          }
        });
      });
  });

  async function init(prescriptionData, isPrintPrescription) {
    if (!isPrintPrescription) {
      var thermalPrintContent = await getThemalPrinterText(prescriptionData);
      if (!thermalPrintContent) {
        common.showErrorMessage(
          "There is no content to print on the thermal printer."
        );
        $("#printableafterGap").html("");
      } else $("#printableafterGap").html(thermalPrintContent);
      return;
    }
    const translations = await common.getTranslations();

    // Convert prescriptionData to Urdu
    const prescriptionDataInUrdu = await translateToUrdu(
      prescriptionData,
      translations
    );
    setPowerValues(prescriptionDataInUrdu);
    setExamFindings(prescriptionData);
    setComplaintPrintData(prescriptionDataInUrdu);
    setDiagnosisPrintData(prescriptionDataInUrdu);
    setMedicinePrintData(prescriptionDataInUrdu);
    setOtherDetailPrintData(prescriptionDataInUrdu);
    setInvestigationPrintData(prescriptionDataInUrdu);
    setPlanPrintData(prescriptionDataInUrdu);
    setpatientinstructionPrintData(prescriptionDataInUrdu);
    setrehabilitationaidsPrintData(prescriptionDataInUrdu);
    setNextFollowUpDateUrdu(prescriptionDataInUrdu);
  }

  async function translateToUrdu(data, translations) {
    if (Array.isArray(data)) {
      // If data is an array, map each item and translate recursively
      return Promise.all(
        data.map((item) => translateToUrdu(item, translations))
      );
    } else if (typeof data === "object" && data !== null) {
      // If data is an object, recursively translate its keys and values
      const translatedData = {};
      for (const [key, value] of Object.entries(data)) {
        translatedData[key] = await translateToUrdu(value, translations);
      }
      return translatedData;
    } else if (typeof data === "string") {
      // Convert the string to lowercase
      const lowerCaseData = data.toLowerCase();

      // Find its Urdu translation
      const translation = translations.find(
        (t) => t.english.toLowerCase() === lowerCaseData
      );
      return translation ? translation.tourdu : data;
    } else {
      // Return other data types (numbers, booleans, null) as is
      return data;
    }
  }

  async function printPrescriptionDirectly(printerName) {
    try {
      // 1. Ensure modal is fully shown and rendered
      const modal = $("#addAttachpatientinstruction");
      if (!modal.hasClass("show")) {
        modal.modal("show");
        await new Promise((resolve) => modal.on("shown.bs.modal", resolve));
      }
      const printContent = document.getElementById("printableArea").innerHTML;
      const stylesheets = [...document.styleSheets]
        .map((sheet) =>
          sheet.href ? `<link rel="stylesheet" href="${sheet.href}">` : ""
        )
        .join("\n");

      // Extract inline styles from the document
      const inlineStyles = [...document.styleSheets]
        .map((styleSheet) => {
          try {
            return [...styleSheet.cssRules]
              .map((rule) => rule.cssText)
              .join("\n");
          } catch (e) {
            return ""; // Handle cross-origin restrictions
          }
        })
        .join("\n");

      const nastaleeqFontCSS = common.getnastaleeqFontCSS(); // 4. Create print-specific HTML with forced styles
      const updatedContent = printContent.replace(
        /nastaleeq\b/g,
        "nastaleeqforQuickPrint"
      );

      const htmlToPrint =
        // 3. Collect all active styles
        `
            <html>
            <head>
                <title>Prescription</title>
                ${stylesheets}  <!-- Include external styles -->
                <style>${nastaleeqFontCSS} ${inlineStyles}</style> <!-- Include inline styles -->
            </head>
            <body>
                    ${updatedContent}

            </body>
            </html>
        `;

      // 5. Send to Electron with proper options
      await window.electronAPI.printDirect({
        type: "prescription",
        data: htmlToPrint,
        printer: printerName,
        options: {
          silent: true,
          printBackground: true,
          margins: {
            marginType: "none",
          },
        },
      });
    } catch (error) {
      common.showErrorMessage("Printing failed: " + error);
      throw error;
    }
  }
  async function getThemalPrinterText(prescriptionData) {
    const translations = await common.getTranslations();
    const prescriptionDataInUrdu = await translateToUrdu(
      prescriptionData,
      translations
    );
    // 1. Get patient name
    const patientName =
      prescriptionDataInUrdu?.patientInformation?.patientname || "Patient";
    const mrNumber =
      prescriptionData?.patientInformation?.mrNumber?.trim() || "";

    // 2. Filter non-printable medicines
    const nonPrintableMeds =
      prescriptionDataInUrdu?.patientInformation?.selectedMedicines
        ?.filter((medicine) => !medicine.isPrintableOnPrescription)
        ?.map(
          (medicine) =>
            plainMedicineName(medicine.medicinename) +
            " " +
            (medicine.injType ? medicine.injType : "") +
            " " +
            (medicine.timingType ? medicine.timingType : "")
        ) || [];

    // 3. Filter non-printable investigations
    const selectedInvestigations =
      prescriptionDataInUrdu?.patientInformation?.selectedInvestigation || [];
    const nonPrintableInvestigations = selectedInvestigations
      .filter((inv) => Array.isArray(inv) && inv[1] === 0) // Check if investigation is non-printable
      .map((inv) => inv[0]); // Get just the name

    // ✅ Exit if there's nothing to print
    if (
      nonPrintableMeds.length === 0 &&
      nonPrintableInvestigations.length === 0
    ) {
      return;
    }

    // 4. Build thermal print content
    let thermalPrintContent = `<div style="margin-left: 20px;">`;
    if (mrNumber) {
      thermalPrintContent += `<strong>MR No:</strong> ${mrNumber}<br>`;
    }
    thermalPrintContent += `<strong>Patient Name:</strong> ${patientName}<br><br>`;

    let hasPreviousContent = false;

    // Add investigations if they exist
    if (nonPrintableInvestigations.length > 0) {
      thermalPrintContent += nonPrintableInvestigations
        .map((inv, index) => `${index + 1}. ${inv}`)
        .join("<br>");
      hasPreviousContent = true;
    }

    // Add medicines if they exist
    if (nonPrintableMeds.length > 0) {
      // Only add separator if we already have investigations
      if (hasPreviousContent) {
        thermalPrintContent +=
          "<br>______________________________________________<br><br>";
      }
      thermalPrintContent += nonPrintableMeds
        .map((med, index) => `${index + 1}. ${med}`)
        .join("<br>");
    }
    return thermalPrintContent;
  }
  async function printOnThermalDirectly(printerName, prescriptionData) {
    try {
      var thermalPrintContent = await getThemalPrinterText(prescriptionData);

      // 5. Send to Electron for printing
      await window.electronAPI.printDirect({
        type: "thermal",
        data: thermalPrintContent,
        printer: printerName,
        options: {
          silent: true,
          pageSize: "80mm",
          margins: { marginType: "none" },
        },
      });
    } catch (error) {
      console.error("Thermal printing failed:", error);
      common.showErrorMessage("Thermal printing failed: " + error.message);
      throw error;
    }
  }

  function cleanDiagnosisString(diagnosis) {
    // Remove the last set of parentheses if they exist at the end
    return diagnosis.replace(/(\([^)]+\))(?=[^()]*$)/, "");
  }

  function setDiagnosisPrintData(prescriptionDataInUrdu) {
    if (
      prescriptionDataInUrdu &&
      prescriptionDataInUrdu.patientInformation &&
      prescriptionDataInUrdu.patientInformation.selectedDiagnosis.length > 0
    ) {
      const cleanedDiagnoses =
        prescriptionDataInUrdu.patientInformation.selectedDiagnosis
          .map((diagnosis) => cleanDiagnosisString(diagnosis))
          .join(", ");
      $("#divDiagnosisList").html(cleanedDiagnoses);
    }
  }

  function setOtherDetailPrintData(prescriptionDataInUrdu) {
    var surgerytext = "";

    // Helper function to format surgery text
    function formatSurgeryText(condition, text) {
      if (condition) {
        return `<span>${text};</span> `;
      }
      return "";
    }

    if (prescriptionDataInUrdu.patientInformation.laminectomy) {
      surgerytext += "Post Op " + formatSurgeryText(true, "laminectomy");
    }
    if (prescriptionDataInUrdu.patientInformation.tpf) {
      surgerytext += "Post Op " + formatSurgeryText(true, "tpf");
    }
    if (prescriptionDataInUrdu.patientInformation.craniotomy) {
      surgerytext += "Post Op " + formatSurgeryText(true, "craniotomy");
    }
    if (prescriptionDataInUrdu.patientInformation.vpshunt) {
      surgerytext += "Post Op " + formatSurgeryText(true, "vpshunt");
    }
    if (prescriptionDataInUrdu.patientInformation.mmc) {
      surgerytext += "Post Op " + formatSurgeryText(true, "mmc");
    }

    if (
      prescriptionDataInUrdu.patientInformation.durationsurgery &&
      prescriptionDataInUrdu.patientInformation.unitsurgery
    ) {
      surgerytext +=
        prescriptionDataInUrdu.patientInformation.durationsurgery +
        "." +
        prescriptionDataInUrdu.patientInformation.unitsurgery +
        " ";
    }
    surgerytext +=
      prescriptionDataInUrdu.patientInformation.patientSurgeryFurtherDetail;

    $("#divExtraDetailLikeSurgery").html(surgerytext.toUpperCase());

    // Rest of your existing code for comorbidities and other fields...
    const comorbidities = [
      { name: "DM", value: prescriptionDataInUrdu.patientInformation.dm },
      { name: "HTN", value: prescriptionDataInUrdu.patientInformation.htn },
      { name: "CVA", value: prescriptionDataInUrdu.patientInformation.cva },
      { name: "CAD", value: prescriptionDataInUrdu.patientInformation.cad },
      {
        name: "HEPATITIS",
        value: prescriptionDataInUrdu.patientInformation.hepatitis,
      },
      {
        name: "TRAUMA",
        value: prescriptionDataInUrdu.patientInformation.trauma,
      },
    ];

    const formattedComorbidities = comorbidities.map((item) => {
      const isPositive = !item.value;
      const valueText = isPositive ? "<strong>+VE</strong>" : "-VE";
      return `${item.name} ${valueText}`;
    });

    const comorbidsHtml = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>${formattedComorbidities[0]},</span>
                <span>${formattedComorbidities[1]},</span>
                <span>${formattedComorbidities[2]}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>${formattedComorbidities[3]},</span>
                <span>${formattedComorbidities[4]},</span>
                <span>${formattedComorbidities[5]}</span>
            </div>
        `;

    $("#divCOMORBIDSList").html(comorbidsHtml);

    $("#spangcs").html(
      `<span style="font-weight: bold">${prescriptionDataInUrdu.patientInformation.gcs}/15</span>`
    );
    $("#spanbp").html(
      `<span style="font-weight: bold">${prescriptionDataInUrdu.patientInformation.bp}</span>`
    );

    // Rest of your existing code...
    $("#spanpatientname").html(
      prescriptionDataInUrdu.patientInformation.patientname
    );
    $("#spanpatientage").html(
      prescriptionDataInUrdu.patientInformation.patientage
    );
    $("#spanpatientcheckupdate").html(
      prescriptionDataInUrdu.patientInformation.checkupDate
    );

    const mrNumber = prescriptionDataInUrdu.patientInformation.mrNumber?.trim();
    if (mrNumber) {
      $("#spanpatientmrnumber").text(mrNumber);
      $("#divPatientMrNumber").show();
    } else {
      $("#spanpatientmrnumber").text("");
      $("#divPatientMrNumber").hide();
    }
  }

  function setPowerValues(prescriptionDataInUrdu) {
    const ulFirst = prescriptionDataInUrdu.patientInformation.powerUL1;
    const ulSecond = prescriptionDataInUrdu.patientInformation.powerUL2;

    $("#powerUL-first")
      .text(ulFirst)
      .toggleClass("bold-value", ulFirst !== "5");
    $("#powerUL-second")
      .text(ulSecond)
      .toggleClass("bold-value", ulSecond !== "5");

    // Set LL values
    const llFirst = prescriptionDataInUrdu.patientInformation.powerLL1;
    const llSecond = prescriptionDataInUrdu.patientInformation.powerLL2;

    $("#powerLL-first")
      .text(llFirst)
      .toggleClass("bold-value", llFirst !== "5");
    $("#powerLL-second")
      .text(llSecond)
      .toggleClass("bold-value", llSecond !== "5");
  }

  function setExamFindings(prescriptionData) {
    const info = prescriptionData.patientInformation;

    // Set values and bold if not default
    $("#reflexesValue")
      .text(info.reflexes || "NORMAL")
      .toggleClass("bold-value", info.reflexes !== "NORMAL");

    $("#faberValue")
      .text(info.feber === "Positive" ? "+VE" : "-VE")
      .toggleClass("bold-value", info.feber === "Positive");

    $("#sensationsValue")
      .text(info.sensations || "INTACT")
      .toggleClass("bold-value", info.sensations === "LOST");

    $("#slrValue")
      .text(info.slr === "RESTRICTED" ? "RESTRICTED" : "NORMAL")
      .toggleClass("bold-value", info.slr === "RESTRICTED");

    $("#sphincterValue")
      .text(info.sphincter || "INTACT")
      .toggleClass("bold-value", info.sphincter === "LOST");

    $("#sperlingValue")
      .text(info.SPERLINGSIGN ? "+VE" : "-VE")
      .toggleClass("bold-value", info.SPERLINGSIGN);

    $("#hoffValue")
      .text(info.HOFFSIGN ? "+VE" : "-VE")
      .toggleClass("bold-value", info.HOFFSIGN);

    $("#phallenValue")
      .text(info.PHALLENSIGN ? "+VE" : "-VE")
      .toggleClass("bold-value", info.PHALLENSIGN);

    $("#tinnelValue")
      .text(info.TINNELSIGN ? "+VE" : "-VE")
      .toggleClass("bold-value", info.TINNELSIGN);
  }

  function setpatientinstructionPrintData(prescriptionDataInUrdu) {
    if (
      !prescriptionDataInUrdu?.patientInformation?.selectedPatientInstructions
        ?.length
    ) {
      $("#patientinstructionDivList").html("");
      return;
    }

    let patientinstructionListHtml = `
        <div style="width: 100%;">
            <div style="display: table; width: 100%;">
    `;

    prescriptionDataInUrdu.patientInformation.selectedPatientInstructions.forEach(
      (instruction) => {
        // Title Row
        patientinstructionListHtml += `
            <div style="display: table-row; width: 100%;">
                <div style="display: table-cell; padding: 8px; text-align: right; vertical-align: middle;">
                    <span class="nastaleeq" style="font-weight: bold;font-size: 16px;color: black;">
                      ${instruction.title}
                    </span>
                </div>
            </div>
        `;

        // Split details by "۔"
        const detailLines = instruction.detail
          .split("۔")
          .map((d) => d.trim())
          .filter((d) => d);

        // Each Line as a Row
        detailLines.forEach((line) => {
          patientinstructionListHtml += `
            <div style="display: table-row; width: 100%;">
                <div style="display: table-cell; padding-right: 8px; text-align: right; vertical-align: middle;">
                    <span class="nastaleeq">${line}۔</span>
                </div>
            </div>
        `;
        });
      }
    );

    patientinstructionListHtml += `
            </div>
        </div>
    `;

    $("#patientinstructionDivList").html(patientinstructionListHtml);
  }

  function setrehabilitationaidsPrintData(prescriptionDataInUrdu) {
    if (
      !prescriptionDataInUrdu?.patientInformation?.selectedRehabilitationAids
        ?.length
    ) {
      $("#rehabilitationaidsDivList").html("");
      return;
    }

    let rehabilitationaidsListHtml = `
            <div style="width: 100%;">
                <div style="display: table; width: 100%;" class="rehab-table">
        `;

    prescriptionDataInUrdu.patientInformation.selectedRehabilitationAids.forEach(
      (rehabilitationaids, index) => {
        // Name row - always odd
        rehabilitationaidsListHtml += `
                <div class="rehab-odd-row" style="display: table-row; width: 100%;">
                    <div style="display: table-cell; padding: 8px; text-align: center; vertical-align: middle; font-style: italic;">
                        <span class="nastaleeq">${rehabilitationaids.name}</span>
                    </div>
                </div>
            `;

        // Detail row - always even
        rehabilitationaidsListHtml += `
                <div class="rehab-even-row" style="display: table-row; width: 100%;">
                    <div style="display: table-cell; padding: 8px; text-align: center; vertical-align: middle;">
                        <span class="nastaleeq">${
                          rehabilitationaids.moreDetail || ""
                        }</span>
                    </div>
                </div>
            `;
      }
    );

    rehabilitationaidsListHtml += `
                </div>
            </div>
        `;

    $("#rehabilitationaidsDivList").html(rehabilitationaidsListHtml);
  }

  function setComplaintPrintData(prescriptionDataInUrdu) {
    if (
      prescriptionDataInUrdu &&
      prescriptionDataInUrdu.patientInformation &&
      prescriptionDataInUrdu.patientInformation.complaintData.length > 0 &&
      prescriptionDataInUrdu.patientInformation.complaintData[0].complaint
    ) {
      var complaintListHtml = "";

      prescriptionDataInUrdu.patientInformation.complaintData.forEach(
        (complaint) => {
          if (complaint.complaint) {
            complaintListHtml += "" + "";

            let durationText = "";
            const duration = complaint.duration;
            const unit = complaint.unit;

            // Check: duration must not be 0, "0", null, empty string, or undefined. Unit must exist.
            const isValidDuration =
              duration !== "0" &&
              duration !== 0 &&
              duration !== "" &&
              duration !== null &&
              duration !== undefined &&
              unit;

            if (isValidDuration) {
              const unitFormatted = duration === "1" ? unit : unit + "s";
              durationText = `${duration} ${unitFormatted.toUpperCase()}`;
            }

            complaintListHtml += `
          <li class="list-item">
            <span class="label">${complaint.complaint}</span>
            <span class="value">${durationText}</span>
          </li>
        `;
          }
        }
      );

      $("#ulcomplaintList").html(complaintListHtml);
    } else {
      $("#divCHIEFCOMPLAINTS").html("");
    }
  }

  function setInvestigationPrintData(prescriptionDataInUrdu) {
    const container = $("#investigationsInlineList");
    const detailsContainer = $("#investigationDetails");

    // Clear previous content
    container.empty();
    detailsContainer.empty().hide();

    if (
      prescriptionDataInUrdu?.patientInformation?.selectedInvestigation
        ?.length > 0
    ) {
      const investigations =
        prescriptionDataInUrdu.patientInformation.selectedInvestigation;

      // Filter for only those with true bit (inv[1] === true), then map names
      const selectedNames = investigations
        .filter((inv) => inv[1] !== 0) // Only include if bit is true
        .map((inv) => inv[0].trim()); // Get the name part

      // Display inline list
      container.text(selectedNames.join(". "));

      // Add additional details
      $("#investigationsDetails").html(
        prescriptionDataInUrdu.patientInformation.investigationMoreDetail
      );
    }
  }

  function setPlanPrintData(prescriptionDataInUrdu) {
    if (
      prescriptionDataInUrdu &&
      prescriptionDataInUrdu.patientInformation &&
      prescriptionDataInUrdu.patientInformation.selectedPlan.length > 0 &&
      prescriptionDataInUrdu.patientInformation.selectedPlan[0]
    ) {
      var planListHtml = "";

      const plans = prescriptionDataInUrdu.patientInformation.selectedPlan;
      $("#ulplanList").html(plans.map((inv) => inv.trim()).join(","));
    } else {
      $("#divPlan").html("");
    }
  }

  function setMedicinePrintData(prescriptionDataInUrdu) {
    if (
      !prescriptionDataInUrdu?.patientInformation?.selectedMedicines?.length
    ) {
      $("#medicineDivList").html("");
      return;
    }

    let medicineListHtml = `
        <table style="width: 100%; border-collapse: collapse;" class="medicine-table">
            <colgroup>
                <col style="width: 45%"> <!-- Medicine name -->
                <col style="width: 10%"> <!-- Duration -->
                <col style="width: 15%"> <!-- Duration number -->
                <col style="width: 20%"> <!-- Timings -->
            </colgroup>
        `;

    let currentMedicineName = null;
    let bgColorClass = "odd-row"; // Start with odd row

    prescriptionDataInUrdu.patientInformation.selectedMedicines.forEach(
      (medicine, index) => {
        // Change color only when medicine name changes
          const medicineName = plainMedicineName(medicine.medicinename);
          if (medicine.isPrintableOnPrescription) {
          if (currentMedicineName !== medicineName) {
            bgColorClass = bgColorClass === "odd-row" ? "even-row" : "odd-row";
          }
          currentMedicineName = medicineName;

          // Prepare timings
          let timingStr = "";
          if (medicine.timingType) {
            const timingTypeMap = {
              SOS: "حسبِ ضرورت",
              STAT: "ابھی",
              OD: "روزانہ",
              OW: "ہفتہ وار",
              OM: "ماہانہ",
              "3Monthly": "تین ماہ بعد",
              OnceYearly: "سالانہ",
            };
            timingStr =
              timingTypeMap[medicine.timingType] || medicine.timingType;
          } else {
            const timings = [];
            if (medicine.morning) timings.push("صبح");
            if (medicine.afternoon) timings.push("دوپہر");
            if (medicine.night) timings.push("رات");
            timingStr = timings.join("، ");
          }

          // Handle duration
          const durationMap = {
            day: "دن",
            week: "ہفتہ",
            month: "مہینہ",
            year: "سال",
            continue: "جاری",
          };
          const durationText = medicine.duration
            ? durationMap[medicine.duration.toLowerCase()] || medicine.duration
            : "";
          const showDuration =
            medicine.durationnumber &&
            medicine.durationnumber != 0 &&
            durationText;
          const durationDisplay = showDuration
            ? `${medicine.durationnumber} ${durationText}`
            : "";

          // Only show medicine name if it's different from previous medicine
          const showMedicineName =
            index === 0 ||
            medicineName !==
              plainMedicineName(
                prescriptionDataInUrdu.patientInformation.selectedMedicines[
                  index - 1
                ].medicinename
              );

          medicineListHtml += `
            <tr class="${bgColorClass}" style="height: 40px;">
                <td style="font-style: italic; font-size: 15px; vertical-align: middle; font-weight: bold; letter-spacing: 0.5px;">
                    ${showMedicineName ? medicineName : ""}
                </td>
                <td style="text-align: center; font-size:13px; vertical-align: middle;" class="nastaleeq">
                    ${durationDisplay}
                </td>
                <td style="text-align: center; font-size:13px; vertical-align: middle;" class="nastaleeq">
                    ${timingStr}
                </td>
                <td style="text-align: center; font-size:13px; vertical-align: middle;" class="nastaleeq">
                    ${medicine.quantity || ""}
                </td>
            </tr>`;

          // Add moreDetails row if it exists
          if (medicine.moredetail) {
            medicineListHtml += `
                <tr class="${bgColorClass}">
                    <td></td>
                    <td colspan="3" style="padding: 0px 30px 10px 0px; text-align: right; font-size:13px;  direction: rtl;" class="nastaleeq">
                        ${medicine.moredetail}
                    </td>
                </tr>`;
          }
        }
      }
    );

    medicineListHtml += `</table>`;
    $("#medicineDivList").html(medicineListHtml);
  }

  function setNextFollowUpDateUrdu(prescriptionDataInUrdu) {
    const duration = parseInt(
      prescriptionDataInUrdu?.patientInformation?.defaultfollowupduration
    );
    const unit =
      prescriptionDataInUrdu?.patientInformation?.defaultfollowupunit;
    if (!duration || !unit || duration == 0) {
      $("#divNextFollowUpDate").html(""); // Clear if any value missing
      return;
    }

    // Urdu unit translations based on singular/plural
    const unitTranslation = {
      day: duration === 1 ? "دن" : "دنوں",
      week: duration === 1 ? "ہفتے" : "ہفتوں",
      month: duration === 1 ? "مہینے" : "مہینوں",
      year: duration === 1 ? "سال" : "سالوں",
    };

    const unitInUrdu = unitTranslation[unit] || "";

    const message = `(دوبارہ چیک اپ ${duration} ${unitInUrdu} بعد)`;

    $("#divNextFollowUpDate").html(
      `<span class="nastaleeq" style="font-size: 12px;">${message}</span>`
    );
  }

  async function printPrescription() {
    if (typeof window.finalizePrescriptionAfterPrintFromPopup === "function") {
      try {
        await window.finalizePrescriptionAfterPrintFromPopup();
      } catch (error) {
        return;
      }
    }

    if (typeof window.markPrescriptionPrintedFromPopup === "function") {
      window.markPrescriptionPrintedFromPopup();
    } else {
      $("#addEditModel").data("prescriptionPrinted", true);
    }

    const printContent = document.getElementById("printableArea").innerHTML;

    // Get all stylesheets (including external ones)
    const stylesheets = [...document.styleSheets]
      .map((sheet) =>
        sheet.href ? `<link rel="stylesheet" href="${sheet.href}">` : ""
      )
      .join("\n");

    // Extract inline styles from the document
    const inlineStyles = [...document.styleSheets]
      .map((styleSheet) => {
        try {
          return [...styleSheet.cssRules]
            .map((rule) => rule.cssText)
            .join("\n");
        } catch (e) {
          return ""; // Handle cross-origin restrictions
        }
      })
      .join("\n");

    // Open new print window
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
            <html>
            <head>
                <title>Prescription</title>
                ${stylesheets}  <!-- Include external styles -->
                <style>${inlineStyles}</style> <!-- Include inline styles -->
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);

    printWindow.document.close();
    printWindow.focus();

    // Wait a bit to ensure styles are loaded before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

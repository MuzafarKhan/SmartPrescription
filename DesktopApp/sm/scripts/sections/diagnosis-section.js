$(document).ready(function () {
    let diagnosisData = {};

    const settings = common.getSettings();

    const investigationDetailValues =
      common.getSettings()[0].investigationDetailValues;

    var select = document.querySelector("#investigationdetailSuggestions");
    investigationDetailValues.split(",").forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    function init() {
      loaddiagnosis();
      loadInvestigation();
      loadPlan();
    }

    async function loaddiagnosis() {
      try {
        const diagnosisListData = await window.electronAPI.getDiagnosis();
        const diagnosisSuggest = $("#diagnosisList").magicSuggest({
          data: diagnosisListData,
          placeholder: "Type or select Diagnose",
          maxSelection: 5,
        });

        // Add event listener for selection change
        $(diagnosisSuggest).on("selectionchange", function () {
          const selectedDiagnoses = diagnosisSuggest.getSelection();
          if (selectedDiagnoses && selectedDiagnoses.length > 0) {
            const diagnosisIds = selectedDiagnoses
              .filter((diagnosis) => !isNaN(parseInt(diagnosis.id))) // Keep only integer IDs
              .map((diagnosis) => diagnosis.id)
              .join(",");
            handleDiagnosisSelection(diagnosisIds);
          } else {
            clearDiagnosisRelatedFields();
          }
          $("#prescriptionForm").trigger("change");
        });
      } catch (error) {
        console.error("Error fetching diagnosis:", error);
      }
    }

    function clearDiagnosisRelatedFields() {
      $("#chiefComplaintsContainer .addedFromDiagnosisChange").remove();
      $("#medicineContainer .addedFromDiagnosisChange").remove();
      $("#rehabilitationAidsContainer .addedFromDiagnosisChange").remove();
      $("#patient-instructionContainer .addedFromDiagnosisChange").remove();
      $("#investigationList").magicSuggest().clear();
      $("#planList").magicSuggest().clear();
      $(".investigation-detail-select").val("");
    }

    async function handleDiagnosisSelection(diagnosisIds) {
      try {
        // Fetch the medicines associated with the diagnosis ID
        const result = await window.electronAPI.getCreateTemplateByDiagnosisIds(
          diagnosisIds.toString()
        );
        if (result && result.length > 0) {
          let mergedTemplateData = {
            complaintData: [],
            selectedInvestigation: [],
            investigationMoreDetail: [],
            selectedPlan: [],
            selectedMedicines: [],
            selectedRehabilitationAids: [],
            selectedPatientInstructions: [],
          };

          result.forEach((item) => {
            var templateData = JSON.parse(item.templateData).patientInformation;

            // Merge complaintData
            mergedTemplateData.complaintData.push(
              ...templateData.complaintData
            );

            // Merge selectedInvestigation
            mergedTemplateData.selectedInvestigation.push(
              ...templateData.selectedInvestigation
            );

            // Merge investigationMoreDetail
            mergedTemplateData.investigationMoreDetail.push(
              templateData.investigationMoreDetail
            );

            // Merge selectedPlan
            mergedTemplateData.selectedPlan.push(...templateData.selectedPlan);

            // Merge selectedMedicines
            mergedTemplateData.selectedMedicines.push(
              ...templateData.selectedMedicines
            );

            // Merge selectedRehabilitationAids
            mergedTemplateData.selectedRehabilitationAids.push(
              ...templateData.selectedRehabilitationAids
            );

            // Merge selectedPatientInstructions
            mergedTemplateData.selectedPatientInstructions.push(
              ...templateData.selectedPatientInstructions
            );
          });

          // Populate the merged data
          populateAllComplaints(mergedTemplateData.complaintData);
          populateInvestigation(
            mergedTemplateData.selectedInvestigation,
            mergedTemplateData.investigationMoreDetail
          );
          populatePlan(mergedTemplateData.selectedPlan);
          populateAllMedicines(mergedTemplateData.selectedMedicines);
          populateRehabilitationAids(
            mergedTemplateData.selectedRehabilitationAids
          );
          populateAllPatientInstructions(
            mergedTemplateData.selectedPatientInstructions
          );
        } else {
          clearDiagnosisRelatedFields();
        }
      } catch (error) {
        $.toast({
          heading: "Error",
          text: error,
          showHideTransition: "fade",
          icon: "error",
          position: "top-right",
        });
      }
    }

    function populateAllComplaints(complaints) {
      if (complaints && complaints.length > 0) {
        // Clear existing rows before populating
        $("#chiefComplaintsContainer .addedFromDiagnosisChange").remove();

        complaints.forEach((complaints, index) => {
          // For each medicine, either populate an existing row or add a new row
          if (index === 0) {
            populateChiefComplaintRow(complaints); // Populate the first row
          } else {
            const newRowHtml = common.getChiefComplaintRow(true); // Create a new row
            $("#chiefComplaintsContainer tbody").append(newRowHtml);
            populateChiefComplaintRow(
              complaints,
              $("#chiefComplaintsContainer .complaint-row").last()
            ); // Populate the new row
          }
        });
        removeEmptyComplaintRows();
      }
    }
    function removeEmptyComplaintRows() {
      $("#chiefComplaintsContainer .complaint-row").each(function () {
        const $row = $(this);
        const inputVal = $row.find(".complaint-input").val().trim();

        // Remove row if empty AND not the last remaining row
        if (
          inputVal === "" &&
          $("#chiefComplaintsContainer .complaint-row").length > 1
        ) {
          $row.remove();
        }
      });
    }

    function populateChiefComplaintRow(complaints, row) {
      // If no row is passed, add a new one
      if (!row) {
        const newRowHtml = common.getChiefComplaintRow(true); // Create a new row
        $("#chiefComplaintsContainer tbody").append(newRowHtml); // Append to the container
        row = $("#chiefComplaintsContainer .complaint-row").last(); // Select the newly added row
      }

      // Populate the row with the medicine data
      row.find(".complaint-input").val(complaints.complaint);
      row.find(".unit-select").val(complaints.unit);
      row.find(".duration-select").val(complaints.duration);
    }

    function populateAllMedicines(medicines) {
      if (medicines && medicines.length > 0) {
        // Clear existing rows before populating
        $("#medicineContainer .addedFromDiagnosisChange").remove();

        medicines.forEach((medicine, index) => {
          // For each medicine, either populate an existing row or add a new row
          if (index === 0) {
            populateMedicineRow(medicine); // Populate the first row
          } else {
            const newRowHtml = common.getMedicineRow(true); // Create a new row
            $("#medicineContainer tbody").append(newRowHtml);
            populateMedicineRow(
              medicine,
              $("#medicineContainer .medicine-row").last()
            ); // Populate the new row
          }
        });
      }
      removeEmptyMedicineRows();
    }
    function removeEmptyMedicineRows() {
      $("#medicineContainer .medicine-row").each(function () {
        const $row = $(this);
        const inputVal = $row.find(".medicine-input").val().trim();

        // Remove row if empty AND not the last remaining row
        if (
          inputVal === "" &&
          $("#medicineContainer .medicine-row").length > 1
        ) {
          $row.remove();
        }
      });
    }
    function populateMedicineRow(medicine, row) {
      // If no row is passed, add a new one
      if (!row) {
        const newRowHtml = common.getMedicineRow(true); // Create a new row
        $("#medicineContainer tbody").append(newRowHtml); // Append to the container
        row = $("#medicineContainer .medicine-row").last(); // Select the newly added row
      }

      // Populate the row with the medicine data
      row.find(".medicine-input").val(medicine.medicinename);
      row.find(".medicine-type").val(medicine.medicinetype).trigger("change");

      // Handle injection type if medicine is injection
      if (medicine.medicinetype === "Inj") {
        row.find(".inj-type").val(medicine.injType).removeClass("hidden");
      } else {
        row.find(".inj-type").addClass("hidden");
      }

      row.find(".quantity").val(medicine.quantity);

      // Handle timing options (mutually exclusive)
      if (medicine.timingType) {
        row.find(".timing-type").val(medicine.timingType).trigger("change");
        row.find(".timing-checkbox").prop("disabled", true);
      } else {
        row.find(".morning").prop("checked", medicine.morning);
        row.find(".afternoon").prop("checked", medicine.afternoon);
        row.find(".night").prop("checked", medicine.night);
        row.find(".timing-type").prop("disabled", true);
      }

      row
        .find(".printable")
        .prop("checked", medicine.isPrintableOnPrescription);
      row.find(".duration-number").val(medicine.durationnumber);
      row.find(".duration").val(medicine.duration);
      row.find(".more-detail").val(medicine.moredetail);
    }

    async function populateInvestigation(
      investigations,
      investigationMoreDetail
    ) {
      $(".investigation-detail-select").val(investigationMoreDetail);

      try {
        const investigationListData =
          await window.electronAPI.getInvestigation();

        const investigationSuggest = $("#investigationList").magicSuggest({
          data: investigationListData,
          placeholder: "Type or select Investigation",
        });

        if (investigations.length > 0) {
          // 🔹 EXISTING LOGIC (unchanged)
          let investigationsToSelect = investigationListData.filter((item) =>
            investigations.some(
              (investigation) =>
                investigation[0].toLowerCase() === item.name.toLowerCase()
            )
          );

          // 🔹 NEW LOGIC: Get custom (non-integer id) items
          const currentSelection = investigationSuggest.getSelection();

          const customInvestigations = currentSelection.filter(
            (item) => !Number.isInteger(item.id)
          );

          // 🔹 Merge them
          investigationsToSelect = [
            ...investigationsToSelect,
            ...customInvestigations,
          ];

          // 🔹 Remove duplicates (safe guard)
          investigationsToSelect = investigationsToSelect.filter(
            (value, index, self) =>
              index === self.findIndex((t) => t.id === value.id)
          );

          investigationSuggest.setSelection(investigationsToSelect);
        }
      } catch (error) {
        console.error("Error loading investigations:", error);
      }
    }
    async function populatePlan(plans) {
      try {
        const planListData = await window.electronAPI.getPlan();

        // Initialize MagicSuggest and store the instance
        let planSuggest = $("#planList").magicSuggest({
          data: planListData,
          placeholder: "Type or select Investigation",
        });

        if (plans.length > 0) {
          // Find matching plans by ID
          let planToSelect = planListData.filter((item) =>
            plans.includes(item.name)
          );

          // Get selected items from MagicSuggest
          const currentSelection = planSuggest.getSelection();

          // Get items where id is NOT integer
          const customPlans = currentSelection.filter(
            (item) => !Number.isInteger(item.id)
          );

          // Add them to planToSelect
          planToSelect = [...planToSelect, ...customPlans];

          // Remove duplicates (optional but recommended)
          planToSelect = planToSelect.filter(
            (value, index, self) =>
              index === self.findIndex((t) => t.id === value.id)
          );

          // Use the MagicSuggest instance to set selection
          planSuggest.setSelection(planToSelect);
        }
      } catch (error) {
        console.error("Error loading plans:", error);
      }
    }

    function populateRehabilitationAids(rehabilitationAids) {
      if (rehabilitationAids && rehabilitationAids.length > 0) {
        // Clear existing rows before populating
        $("#rehabilitationAidsContainer .addedFromDiagnosisChange").remove();

        rehabilitationAids.forEach((rehabilitationAid, index) => {
          // For each medicine, either populate an existing row or add a new row
          if (index === 0) {
            populateRehabilitationAidRow(rehabilitationAid); // Populate the first row
          } else {
            const newRowHtml = common.getRehabilitationAidRow(true); // Create a new row
            $("#rehabilitationAidsContainer tbody").append(newRowHtml);
            populateRehabilitationAidRow(
              rehabilitationAid,
              $("#rehabilitationAidsContainer .rehabilitation-aids-row").last()
            ); // Populate the new row
          }
        });
      }
      removeEmptyRehabilitationAidRows();
    }
    function removeEmptyRehabilitationAidRows() {
      $("#rehabilitationAidsContainer .rehabilitation-aids-row").each(
        function () {
          const $row = $(this);
          const inputVal = $row.find(".rehabilitation-aids-input").val().trim();

          // Remove row if empty AND not the last remaining row
          if (
            inputVal === "" &&
            $("#rehabilitationAidsContainer .rehabilitation-aids-row").length >
              1
          ) {
            $row.remove();
          }
        }
      );
    }
    function populateRehabilitationAidRow(rehabilitationAid, row) {
      // If no row is passed, add a new one
      if (!row) {
        const newRowHtml = common.getRehabilitationAidRow(true); // Create a new row
        $("#rehabilitationAidsContainer tbody").append(newRowHtml); // Append to the container
        row = $("#rehabilitationAidsContainer .rehabilitation-aids-row").last(); // Select the newly added row
      }
      // Populate the row with the medicine data
      row.find(".rehabilitation-aids-input").val(rehabilitationAid.name);
      row.find(".moredetail-input").val(rehabilitationAid.moreDetail);
    }

    function populateAllPatientInstructions(patientInstructions) {
      if (patientInstructions && patientInstructions.length > 0) {
        // Clear existing rows before populating
        $("#patient-instructionContainer .addedFromDiagnosisChange").remove();

        patientInstructions.forEach((patientInstruction, index) => {
          // For each medicine, either populate an existing row or add a new row
          if (index === 0) {
            populateAllPatientInstructionsRow(patientInstruction); // Populate the first row
          } else {
            const newRowHtml = common.getPatientInstructionRow(true); // Create a new row
            $("#patient-instructionContainer tbody").append(newRowHtml);
            populateAllPatientInstructionsRow(
              patientInstruction,
              $("#patient-instructionContainer .patient-instruction-row").last()
            ); // Populate the new row
          }
        });
      }
      removeEmptyPatientInstructionsRows();
    }
    function removeEmptyPatientInstructionsRows() {
      $("#patient-instructionContainer .patient-instruction-row").each(
        function () {
          const $row = $(this);
          const inputVal = $row.find(".patient-instruction-input").val().trim();

          // Remove row if empty AND not the last remaining row
          if (
            inputVal === "" &&
            $("#patient-instructionContainer .patient-instruction-row").length >
              1
          ) {
            $row.remove();
          }
        }
      );
    }
    function populateAllPatientInstructionsRow(patientInstruction, row) {
      // If no row is passed, add a new one
      if (!row) {
        const newRowHtml = common.getPatientInstructionRow(true); // Create a new row
        $("#patient-instructionContainer tbody").append(newRowHtml); // Append to the container
        row = $(
          "#patient-instructionContainer .patient-instruction-row"
        ).last(); // Select the newly added row
      }
      // Populate the row with the medicine data
      row.find(".patient-instruction-input").val(patientInstruction.title);
      row.find("#textPInstDetail").val(patientInstruction.detail);
    }

    async function loadInvestigation() {
      try {
        const investigationListData =
          await window.electronAPI.getInvestigation();

        var investigationSuggest = $("#investigationList").magicSuggest({
          data: investigationListData,
          placeholder: "Type or select Investigation",
          maxSelection: 5,
        });
        $(investigationSuggest).on("selectionchange", function () {
          $("#prescriptionForm").trigger("change");
        });
      } catch (error) {
        console.error("Error fetching investigation", error);
      }
    }

    async function loadPlan() {
      try {
        const planListData = await window.electronAPI.getPlan();
        var planSuggest = $("#planList").magicSuggest({
          data: planListData,
          placeholder: "Type or select Plan",
          maxSelection: 3,
        });
        $(planSuggest).on("selectionchange", function () {
          $("#prescriptionForm").trigger("change");
        });
      } catch (error) {
        console.error("Error fetching plan:", error);
      }
    }

    init();
  });

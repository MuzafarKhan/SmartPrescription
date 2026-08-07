$("#patient-instruction-section").load(
              "./sections/patient-instruction-section.html"
            );

$(document).ready(function () {
    $("#addAttachPatientInstruction").modal("show");
    $(".modal-dialog").addClass("width-100");
    $("#attachPatientInstruction").on("click", function () {
      const patientinstructionsArray = getAllPatientInstructions();
      if (attachPatientInstructionValidated(patientinstructionsArray)) {
        attachPatientInstructionC(patientinstructionsArray);
      }
    });

    async function attachPatientInstructionC(patientinstructionsArray) {
      var id = $("#hdnId").html();
      attachPatientInstruction(id, patientinstructionsArray);
      $("#addAttachPatientInstruction").modal("hide");
      loadPageContent(
        "diagnosis",
        "diagnosisTable",
        $("#diagnosisTable").DataTable().page()
      );
    }
    async function attachPatientInstruction(id, patientinstructionsArray) {
      const results = await window.electronAPI.attachPatientInstruction(
        id,
        patientinstructionsArray
      );
      common.showSavedSuccessfullyMessage();
    }

    function attachPatientInstructionValidated(patientinstructionsArray) {
      let isValid = true;
      patientinstructionsArray.forEach((patientinstruction, index) => {
        if (isValid) {
          const error = {};

          // Check if patient-instruction name is empty
          if (!patientinstruction.title.trim()) {
            $.toast({
              heading: "Error",
              text: `Title is required in ( ROW ${index + 1} )`,
              showHideTransition: "fade",
              icon: "error",
              position: "top-right",
            });
            isValid = false;
          }

          if (!patientinstruction.detail.trim()) {
            $.toast({
              heading: "Error",
              text: `Detail is required in ( ROW ${index + 1} )`,
              showHideTransition: "fade",
              icon: "error",
              position: "top-right",
            });
            isValid = false;
          }
        }
      });

      return isValid;
    }

    function getAllPatientInstructions() {
      const patientinstructions = [];

      $("#patient-instructionContainer .patient-instruction-row").each(
        function () {
          const patientinstructionRow = $(this);

          // Create an object for each patient-instruction row
          const patientinstruction = {
            title: patientinstructionRow
              .find(".patient-instruction-input")
              .val(),
            detail: patientinstructionRow.find("[id^='textPInstDetail']").val(),
          };

          // Add the object to the patient-instructions array
          patientinstructions.push(patientinstruction);
        }
      );

      return patientinstructions;
    }

    async function init(id) {
      $("#hdnId").html(id);
      try {
        // Fetch the patient-instructions associated with the diagnosis ID
        const result =
          await window.electronAPI.getAttachPatientInstructionByDiagnosisIds(
            id.toString()
          );

        if (result && result.length > 0) {
          // Clear existing rows before populating
          $("#patient-instructionContainer .patient-instruction-row").remove();

          result.forEach((patientinstruction, index) => {
            // For each patient-instruction, either populate an existing row or add a new row
            if (index === 0) {
              populatePatientInstructionRow(patientinstruction); // Populate the first row
            } else {
              const newRowHtml = common.getPatientInstructionRow(); // Create a new row
              $("#patient-instructionContainer tbody").append(newRowHtml);
              populatePatientInstructionRow(
                patientinstruction,
                $(
                  "#patient-instructionContainer .patient-instruction-row"
                ).last()
              ); // Populate the new row
            }
          });
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

    function populatePatientInstructionRow(patientinstruction, row) {
      if (!row) {
        const newRowHtml = common.getPatientInstructionRow();
        $("#patient-instructionContainer tbody").append(newRowHtml);
        row = $(
          "#patient-instructionContainer .patient-instruction-row"
        ).last();
      }
      row.find(".patient-instruction-input").val(patientinstruction.title);
      row.find("[id^='textPInstDetail']").val(patientinstruction.detail);
    }

    // Trigger initialization with the ID from the modal
    const id = $("#addEditModel").data("id");
    if (id) {
      init(id);
    }
  });

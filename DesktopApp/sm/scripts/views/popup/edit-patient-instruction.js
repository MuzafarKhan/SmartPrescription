$(document).ready(function () {
    $("#addPatientInstructionModal").modal("show");
    $("#savePatientInstruction").on("click", function () {
      if (patientinstructionValidated()) {
        savePatientInstruction();
      }
    });

    async function savePatientInstruction() {
      var id = $("#hdnId").html();
      var patientinstructionTitle = $("#patientinstructionTitle").val().trim();
      var textPInstDetail = $("#textPInstDetail").val().trim();

      if (id) {
        updatePatientInstruction(id, patientinstructionTitle, textPInstDetail);
      } else {
        addPatientInstruction(patientinstructionTitle, textPInstDetail);
      }
      $("#addPatientInstructionModal").modal("hide");
      loadPageContent(
        "patient-instruction",
        "patientinstructionTable",
        $("#patientinstructionTable").DataTable().page()
      );
    }
    async function updatePatientInstruction(
      id,
      patientinstructionTitle,
      textPInstDetail
    ) {
      const results = await window.electronAPI.updatePatientInstruction(
        id,
        patientinstructionTitle,
        textPInstDetail
      );
      common.showUpdatedSuccessfullyMessage();
    }

    async function addPatientInstruction(
      patientinstructionTitle,
      textPInstDetail
    ) {
      const results = await window.electronAPI.addPatientInstruction(
        patientinstructionTitle,
        textPInstDetail
      );
      common.showSavedSuccessfullyMessage();
    }

    function patientinstructionValidated() {
      if (!$("#patientinstructionTitle").val().trim()) {
        $.toast({
          heading: "Error",
          text: "Patient Instruction Title is required",
          showHideTransition: "fade",
          icon: "error",
          position: "top-right",
        });
        return false;
      }
      if (!$("#textPInstDetail").val().trim()) {
        $.toast({
          heading: "Error",
          text: "Detail is required",
          showHideTransition: "fade",
          icon: "error",
          position: "top-right",
        });
        return false;
      }

      return true;
    }

    function init(id) {
      $("#hdnId").html(id);
      window.electronAPI
        .getPatientInstructionById(id)
        .then((result) => {
          $("#patientinstructionTitle").val(result[0].title);
          $("#textPInstDetail").val(result[0].detail);
        })
        .catch((error) => {
          $.toast({
            heading: "Error",
            text: error,
            showHideTransition: "fade",
            icon: "error",
            position: "top-right",
          });
        });
    }
    const id = $("#addEditModel").data("id");
    if (id) {
      init(id);
    }
  });

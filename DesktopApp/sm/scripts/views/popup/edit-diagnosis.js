$(document).ready(function () {
    $("#addDiagnosisModal").modal("show");
    $("#saveDiagnosis").on("click", function () {
      if (diagnosisValidated()) {
        saveDiagnosis();
      }
    });

    async function saveDiagnosis() {
      var id = $("#hdnId").html();
      var diagnosisText = $("#diagnosisText").val().trim();
      var diagnosisAlterText = $("#diagnosisAlterText").val().trim();

      if (id) {
        updateDiagnosis(id, diagnosisText, diagnosisAlterText);
      } else {
        addDiagnosis(diagnosisText, diagnosisAlterText);
      }
      $("#addDiagnosisModal").modal("hide");
      loadPageContent(
        "diagnosis",
        "diagnosisTable",
        $("#diagnosisTable").DataTable().page()
      );
    }
    async function updateDiagnosis(id, name, diagnosisAlterText) {
      const results = await window.electronAPI.updateDiagnosis(
        id,
        name,
        diagnosisAlterText
      );
      common.showUpdatedSuccessfullyMessage();
    }

    async function addDiagnosis(name, diagnosisAlterText) {
      const results = await window.electronAPI.addDiagnosis(
        name,
        diagnosisAlterText
      );
      common.showSavedSuccessfullyMessage();
    }

    function diagnosisValidated() {
      if (!$("#diagnosisText").val().trim()) {
        $.toast({
          heading: "Error",
          text: "Diagnosis Text is required",
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
        .getDiagnosisById(id)
        .then((result) => {
          $("#diagnosisText").val(result[0].name);
          $("#diagnosisAlterText").val(result[0].nameAlter);
        })
        .catch((error) => {
          $.toast({
            heading: "Error",
            text: "Error fetching data:",
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

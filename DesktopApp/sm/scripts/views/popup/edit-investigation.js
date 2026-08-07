$(document).ready(function () {
    $("#addInvestigationModal").modal("show");
    $("#saveInvestigation").on("click", function () {
      if (investigationValidated()) {
        saveInvestigation();
      }
    });

    async function saveInvestigation() {
      var id = $("#hdnId").html();
      var investigationText = $("#investigationText").val().trim();
      var isPrintableOnPrescription = $(
        "#isPrintableOnPrescriptionCheckChecked"
      ).prop("checked")
        ? 1
        : 0;

      if (id) {
        updateInvestigation(id, investigationText, isPrintableOnPrescription);
      } else {
        addInvestigation(investigationText, isPrintableOnPrescription);
      }
      $("#addInvestigationModal").modal("hide");
      loadPageContent(
        "investigation",
        "investigationTable",
        $("#investigationTable").DataTable().page()
      );
    }
    async function updateInvestigation(id, name, isPrintableOnPrescription) {
      const results = await window.electronAPI.updateInvestigation(
        id,
        name,
        isPrintableOnPrescription
      );
      common.showUpdatedSuccessfullyMessage();
    }

    async function addInvestigation(name, isPrintableOnPrescription) {
      const results = await window.electronAPI.addInvestigation(
        name,
        isPrintableOnPrescription
      );
      common.showSavedSuccessfullyMessage();
    }

    function investigationValidated() {
      if (!$("#investigationText").val().trim()) {
        $.toast({
          heading: "Error",
          text: "Investigation Text is required",
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
        .getInvestigationById(id)
        .then((result) => {
          $("#investigationText").val(result[0].name);
          $("#isPrintableOnPrescriptionCheckChecked").prop(
            "checked",
            result[0].isPrintableOnPrescription === 1
          );
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

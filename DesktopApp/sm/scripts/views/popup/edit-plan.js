$(document).ready(function () {
    $("#addPlanModal").modal("show");
    $("#savePlan").on("click", function () {
      if (planValidated()) {
        savePlan();
      }
    });

    async function savePlan() {
      var id = $("#hdnId").html();
      var planText = $("#planText").val().trim();

      if (id) {
        updatePlan(id, planText);
      } else {
        addPlan(planText);
      }
      $("#addPlanModal").modal("hide");
      loadPageContent("plan", "planTable", $("#planTable").DataTable().page());
    }
    async function updatePlan(id, name) {
      const results = await window.electronAPI.updatePlan(id, name);
      common.showUpdatedSuccessfullyMessage();
    }

    async function addPlan(name) {
      const results = await window.electronAPI.addPlan(name);
      common.showSavedSuccessfullyMessage();
    }

    function planValidated() {
      if (!$("#planText").val().trim()) {
        $.toast({
          heading: "Error",
          text: "Plan Text is required",
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
        .getPlanById(id)
        .then((result) => {
          $("#planText").val(result[0].name);
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

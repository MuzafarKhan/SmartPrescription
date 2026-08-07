$(document).ready(function () {
    let planData = {};

    // Fetch plan and populate datalist
    async function init() {
      try {
        const plans = await window.electronAPI.getPlan();
        const dataList = $("#planSuggestions");
        dataList.empty();

        plans.forEach((plan) => {
          planData[plan.name] = plan;
          dataList.append(`<option value="${plan.name}"></option>`);
        });
      } catch (error) {
        console.error("Error fetching plan:", error);
      }
    }

    // Add new plan row
    function addPlanRow() {
      const newRow = $("#planContainer .plan-row:first").clone();
      newRow.find("input").val("");
      $("#planContainer tbody").append(newRow);
    }

    // Remove plan row
    $(document).on("click", ".remove-plan", function () {
      if ($("#planContainer .plan-row").length > 1) {
        $(this).closest("tr").remove();
      }
    });

    // Add new row button
    $("#addPlanBtn").on("click", function (event) {
      event.preventDefault();
      addPlanRow();
    });

    // Example: Log plan on double-click
    $("#addPlanBtn").on("dblclick", function () {
      // console.log(getPlan());
    });

    init();
  });

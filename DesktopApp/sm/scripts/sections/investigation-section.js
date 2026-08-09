$(document).ready(function () {
    let investigationData = {};

    // Fetch investigation and populate datalist
    async function init() {
      try {
        const investigations = await window.electronAPI.getInvestigation();
        const dataList = $("#investigationSuggestions");
        dataList.empty();

        investigations.forEach((investigation) => {
          investigationData[investigation.name] = investigation;
          dataList.append(`<option value="${investigation.name}"></option>`);
        });
      } catch (error) {
        console.error("Error fetching investigation:", error);
      }
    }

    // Add new investigation row
    function addInvestigationRow() {
      const newRow = $(
        "#investigationContainer .investigation-row:first"
      ).clone();
      newRow.find("input").val("");
      $("#investigationContainer tbody").append(newRow);
    }

    // Remove investigation row
    $(document).on("click", ".remove-investigation", async function (event) {
      event.preventDefault();
      if ($("#investigationContainer .investigation-row").length <= 1) {
        return;
      }

      if (
        !(await common.confirmDelete({
          title: "Remove investigation?",
          text: "This investigation will be removed from the prescription.",
          confirmButtonText: "Yes, remove it!",
        }))
      ) {
        return;
      }

      $(this).closest("tr").remove();
    });

    // Add new row button
    $("#addInvestigationBtn").on("click", function (event) {
      event.preventDefault();
      addInvestigationRow();
    });

    // Example: Log investigation on double-click
    $("#addInvestigationBtn").on("dblclick", function () {
      // console.log(getInvestigation());
    });

    init();
  });

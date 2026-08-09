$(document).ready(function () {
    let rehabilitationaidsData = {};

    // Fetch rehabilitation aids and populate datalist
    async function init() {
      try {
        const rehabilitationaids =
          await window.electronAPI.getRehabilitationAids();
        const dataList = $("#rehabilitation-aidsSuggestions");
        dataList.empty();

        rehabilitationaids.forEach((rehabilitationaid) => {
          rehabilitationaidsData[rehabilitationaid.name] = rehabilitationaid;
          dataList.append(
            `<option value="${rehabilitationaid.name}"></option>`
          );
        });
      } catch (error) {
        console.error("Error fetching rehabilitation aids:", error);
      }
    }

    $(document).on("click", ".remove-rehabilitation-aids", async function (event) {
      event.preventDefault();
      if (
        !(await common.confirmDelete({
          title: "Remove rehabilitation aid?",
          text: "This item will be removed from the prescription.",
          confirmButtonText: "Yes, remove it!",
        }))
      ) {
        return;
      }

      $(this).closest("tr").remove();
    });

    // Add new row button
    $("#addRehabilitationAidsBtn").on("click", function (event) {
      init();
      event.preventDefault();
      newRowHtml = common.getRehabilitationAidRow();
      $("#rehabilitationAidsContainer tbody").append(newRowHtml);
    });

    $(document).on("input", ".rehabilitation-aids-input", function () {
      const selectedRehabilitationAids = $(this).val();
      const rehabilitationRow = $(this).closest("tr");

      if (rehabilitationaidsData[selectedRehabilitationAids]) {
        const rehabilitationAidDetails =
          rehabilitationaidsData[selectedRehabilitationAids];

        // Find elements with IDs that start with "moredetail" and update the value
        rehabilitationRow
          .find("[id^='moredetail']") // Find elements whose ID starts with "moredetail"
          .val(rehabilitationAidDetails.moredetail); // Set more details
      }
    });

    init();
  });

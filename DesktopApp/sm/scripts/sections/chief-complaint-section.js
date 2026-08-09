$(document).ready(function () {
    let complaintsData = {};

    // Fetch complaints and populate datalist
    async function init() {
      try {
        const complaints = await window.electronAPI.getChiefComplaint();
        const dataList = $("#complaintSuggestions");
        dataList.empty();

        complaints.forEach((complaint) => {
          complaintsData[complaint.complaint] = complaint;
          dataList.append(`<option value="${complaint.complaint}"></option>`);
        });
      } catch (error) {
        console.error("Error fetching complaints:", error);
      }
    }

    // Remove complaint row
    $(document).on("click", ".remove-complaint", async function (event) {
      event.preventDefault();
      if (
        !(await common.confirmDelete({
          title: "Remove complaint?",
          text: "This complaint will be removed from the prescription.",
          confirmButtonText: "Yes, remove it!",
        }))
      ) {
        return;
      }

      $(this).closest("tr").remove();
    });

    // Add new row button
    $("#addComplaintBtn").on("click", function (event) {
      init();
      event.preventDefault();
      newRowHtml = common.getChiefComplaintRow();
      newRowHtml = $(newRowHtml); // Convert to jQuery object for easy manipulation

      // Modify values before appending
      newRowHtml.find(".complaint-input").val("");
      newRowHtml
        .find(".duration-select")
        .val(common.getSettings()[0].defaultcomplaintduration); // Set duration to 5
      newRowHtml
        .find(".unit-select")
        .val(common.getSettings()[0].defaultcomplaintunit); // Set unit to week

      $("#chiefComplaintsContainer tbody").append(newRowHtml);
    });

    // Add new row button
    $("#addNewComplaintBtn").on("click", function (event) {
      event.preventDefault();
      $("#addEditModel").data("id", 0);
      $("#addEditModel").load("views/popup/edit-chief-complaint.html");
    });

    // Get all complaints with durations
    function getComplaints() {
      const complaints = [];
      $(".complaint-row").each(function () {
        const complaint = $(this).find(".complaint-input").val();
        const duration = $(this).find(".duration-select").val();
        const unit = $(this).find(".unit-select").val();
        complaints.push({ complaint, duration, unit });
      });
      return complaints;
    }

    // Example: Log complaints on double-click
    $("#addComplaintBtn").on("dblclick", function () {
      console.log(getComplaints());
    });

    init();
  });

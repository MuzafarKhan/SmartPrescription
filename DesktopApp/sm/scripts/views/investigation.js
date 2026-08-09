$(document).ready(function () {
        // Initialize DataTable
        const table = $("#investigationTable").DataTable();

        // Fetch and populate table
        window.electronAPI
          .getInvestigation()
          .then((investigations) => {
            table.clear();
            investigations.forEach((investigation) => {
              table.row
                .add([
                  investigation.id,
                  investigation.name,
                  '<button class="btn btn-warning btn-sm" onclick="openEditInvestigation(' +
                    investigation.id +
                    ',event)">Update</button>' +
                    '<button class="btn btn-danger btn-sm delete-row ms-1" onclick="deleteInvestigation(' +
                    investigation.id +
                    ',event)">Delete</button>',
                ])
                .draw();
            });
            common.refreshTablePaging();
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

        $("#btnAddInvestigationModal").on("click", function () {
          $("#addEditModel").data("id", 0);
          $("#addEditModel").load("views/popup/edit-investigation.html");
        });
      });

      async function deleteInvestigation(id, event) {
        event.preventDefault();
        if (!(await common.confirmDelete())) return;

        window.electronAPI.deleteInvestigationById(id);
        common.showDeletedSuccessfullyMessage();
        loadPageContent(
          "investigation",
          "investigationTable",
          $("#investigationTable").DataTable().page()
        );
      }

      function openEditInvestigation(id, event) {
        event.preventDefault();
        $("#addEditModel").load(
          "views/popup/edit-investigation.html",
          function () {
            // After loading, pass the id dynamically
            $("#addEditModel").data("id", id);
          }
        );
      }

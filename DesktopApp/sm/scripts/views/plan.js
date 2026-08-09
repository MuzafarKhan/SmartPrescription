$(document).ready(function () {
        // Initialize DataTable
        const table = $("#planTable").DataTable();

        // Fetch and populate table
        window.electronAPI
          .getPlan()
          .then((plans) => {
            table.clear();
            plans.forEach((plan) => {
              table.row
                .add([
                  plan.id,
                  plan.name,
                  '<button class="btn btn-warning btn-sm" onclick="openEditPlan(' +
                    plan.id +
                    ',event)">Update</button>' +
                    '<button class="btn btn-danger btn-sm delete-row ms-1" onclick="deletePlan(' +
                    plan.id +
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

        $("#btnAddPlanModal").on("click", function () {
          $("#addEditModel").data("id", 0);
          $("#addEditModel").load("views/popup/edit-plan.html");
        });
      });

      async function deletePlan(id, event) {
        event.preventDefault();
        if (!(await common.confirmDelete())) return;

        window.electronAPI.deletePlanById(id);
        common.showDeletedSuccessfullyMessage();
        loadPageContent(
          "plan",
          "planTable",
          $("#planTable").DataTable().page()
        );
      }

      function openEditPlan(id, event) {
        event.preventDefault();
        $("#addEditModel").load("views/popup/edit-plan.html", function () {
          // After loading, pass the id dynamically
          $("#addEditModel").data("id", id);
        });
      }

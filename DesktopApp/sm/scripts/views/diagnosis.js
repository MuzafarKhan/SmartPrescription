$(document).ready(function () {
        // Initialize DataTable
        const table = $("#diagnosisTable").DataTable();

        // Fetch and populate table
        window.electronAPI
          .getDiagnosis()
          .then((diagnosiss) => {
            table.clear();
            diagnosiss.forEach((diagnosis) => {
              table.row
                .add([
                  diagnosis.id,
                  diagnosis.name,
                  '<button class="btn btn-warning btn-sm" onclick="openEditDiagnosis(' +
                    diagnosis.id +
                    ',event)">Update</button>' +
                    '<button class="btn btn-danger btn-sm ms-1" onclick="deleteDiagnosis(' +
                    diagnosis.id +
                    ',event)">Delete</button>' +
                    '<button class="btn btn-info btn-sm ms-1 hidden" onclick="attachMedicine(' +
                    diagnosis.id +
                    ',event)">Attach Medicine</button>' +
                    '<button class="btn btn-info btn-sm ms-1 hidden" onclick="attachPatientInstruction(' +
                    diagnosis.id +
                    ',event)">Attach Patient Instruction</button>' +
                    '<button class="btn btn-info btn-sm ms-1" onclick="createTemplate(' +
                    diagnosis.id +
                    ',event)">Create Template</button>',
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

        $("#btnAddDiagnosisModal").on("click", function () {
          $("#addEditModel").data("id", 0);
          $("#addEditModel").load("views/popup/edit-diagnosis.html");
        });
      });

      async function deleteDiagnosis(id, event) {
        event.preventDefault();
        if (!(await common.confirmDelete())) return;

        window.electronAPI.deleteDiagnosisById(id);
        common.showDeletedSuccessfullyMessage();
        loadPageContent(
          "diagnosis",
          "diagnosisTable",
          $("#diagnosisTable").DataTable().page()
        );
      }

      function openEditDiagnosis(id, event) {
        event.preventDefault();
        $("#addEditModel").load("views/popup/edit-diagnosis.html", function () {
          // After loading, pass the id dynamically
          $("#addEditModel").data("id", id);
        });
      }

      function attachMedicine(id, event) {
        event.preventDefault();
        $("#addEditModel").load(
          "views/popup/edit-attach-medicine.html",
          function () {
            // After loading, pass the id dynamically
            $("#addEditModel").data("id", id);
          }
        );
      }
      function attachPatientInstruction(id, event) {
        event.preventDefault();
        $("#addEditModel").load(
          "views/popup/edit-attach-patient-instruction.html",
          function () {
            // After loading, pass the id dynamically
            $("#addEditModel").data("id", id);
          }
        );
      }
      function createTemplate(id, event) {
        event.preventDefault();
        $("#addEditModel").load(
          "views/popup/edit-create-template.html",
          function () {
            // After loading, pass the id dynamically
            $("#addEditModel").data("id", id);
          }
        );
      }

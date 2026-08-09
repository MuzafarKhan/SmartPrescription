$(document).ready(function () {
        // Initialize DataTable
        const table = $("#patientinstructionTable").DataTable();

        // Fetch and populate table
        window.electronAPI
          .getPatientInstruction()
          .then((patientinstructions) => {
            table.clear();
            patientinstructions.forEach((patientinstruction) => {
              table.row
                .add([
                  patientinstruction.id,
                  patientinstruction.title,
                  patientinstruction.detail,
                  '<button class="btn btn-warning btn-sm" onclick="openEditPatientInstruction(' +
                    patientinstruction.id +
                    ',event)">Update</button>' +
                    '<button class="btn btn-danger btn-sm delete-row ms-1" onclick="deletePatientInstruction(' +
                    patientinstruction.id +
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

        $("#btnAddPatientInstructionModal").on("click", function () {
          $("#addEditModel").data("id", 0);
          $("#addEditModel").load("views/popup/edit-patient-instruction.html");
        });
      });

      async function deletePatientInstruction(id, event) {
        event.preventDefault();
        if (!(await common.confirmDelete())) return;

        window.electronAPI.deletePatientInstructionById(id);
        common.showDeletedSuccessfullyMessage();
        loadPageContent(
          "patient-instruction",
          "patientinstructionTable",
          $("#patientinstructionTable").DataTable().page()
        );
      }

      function openEditPatientInstruction(id, event) {
        event.preventDefault();
        $("#addEditModel").load(
          "views/popup/edit-patient-instruction.html",
          function () {
            // After loading, pass the id dynamically
            $("#addEditModel").data("id", id);
          }
        );
      }

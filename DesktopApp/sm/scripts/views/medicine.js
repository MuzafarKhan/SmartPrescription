$(document).ready(function () {
        // Initialize DataTable
        const table = $("#medicineTable").DataTable();

        // Fetch and populate table
        window.electronAPI
          .getMedicine()
          .then((medicine) => {
            table.clear();
            medicine.forEach((medicine) => {
              let nightText = table.row
                .add([
                  medicine.id,
                  medicine.medicinename,
                  getTimingInEnglish(medicine),
                  medicine.quantity,
                  medicine.durationnumber && medicine.duration
                    ? medicine.durationnumber + " " + medicine.duration
                    : "",
                  '<button class="btn btn-warning btn-sm" onclick="openEditMedicine(' +
                    medicine.id +
                    ',event)">Update</button>' +
                    '<button class="btn btn-danger btn-sm delete-row ms-1" onclick="deleteMedicine(' +
                    medicine.id +
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

        $("#btnAddMedicineModal").on("click", function () {
          $("#addEditModel").data("id", 0);
          $("#addEditModel").load("views/popup/edit-medicine.html");
        });
      });
      function getTimingInEnglish(medicine) {
        var timing = "";

        if (medicine.morning === 1) {
          timing += "<span>Morning</span>";
        }

        if (medicine.afternoon === 1) {
          // Append comma if timing is not empty
          if (timing) timing += " , ";
          timing += "<span>Afternoon</span>";
        }

        if (medicine.night === 1) {
          // Append comma if timing is not empty
          if (timing) timing += " , ";
          timing += "<span>Night</span>";
        }

        return timing;
      }

      function getTimingInUrdu(medicine) {
        var timing = "";

        if (medicine.morning === 1) {
          timing += '<span class="nastaleeq">صبح</span>';
        }

        if (medicine.afternoon === 1) {
          // Append dash if timing is not empty
          if (timing) timing += " , ";
          timing += '<span class="nastaleeq">دوپہر</span>';
        }

        if (medicine.night === 1) {
          // Append dash if timing is not empty
          if (timing) timing += " , ";
          timing += '<span class="nastaleeq">شام</span>';
        }

        if (medicine.isPrintableOnPrescription) {
          timing +=
            '<span class="nastaleeq" style="font-size:12px;">(کھانے سے پہلے)</span>';
        }

        return timing;
      }

      function deleteMedicine(id, event) {
        event.preventDefault();
        Swal.fire({
          title: "Are you sure?",
          text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, delete it!",
        }).then((result) => {
          if (result.isConfirmed) {
            window.electronAPI.deleteMedicineById(id);
            common.showDeletedSuccessfullyMessage();
            loadPageContent(
              "medicine",
              "medicineTable",
              $("#medicineTable").DataTable().page()
            );
          }
        });
      }

      function openEditMedicine(id, event) {
        event.preventDefault();
        $("#addEditModel").load("views/popup/edit-medicine.html", function () {
          // After loading, pass the id dynamically
          $("#addEditModel").data("id", id);
        });
      }

$(document).ready(function () {
  $("#pinecode").on("blur", function () {
    const pincode = $(this).val().trim();
    const pincodeRegex = /^[1-9][0-9]{5}$/;

    if (!pincodeRegex.test(pincode)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Pincode",
        text: "Please enter a valid 6-digit Indian pincode.",
      });
      return;
    }

    $.get(
      `https://api.postalpincode.in/pincode/${pincode}`,
      function (response) {
        if (response[0].Status === "Success") {
          const postOffice = response[0].PostOffice[0];
          $("#city").val(postOffice.District);
          $("#state").val(postOffice.State);
          $("#country").val(postOffice.Country);
        } else {
          Swal.fire({
            icon: "error",
            title: "Pincode Not Found",
            text: "Please check the pincode and try again.",
          });
        }
      }
    );
  });
  $("form").on("submit", function (e) {
    e.preventDefault();
    const submitBtn = $(this).find('button[type="submit"]');
    submitBtn.prop("disabled", true);

    const name = $("#name").val().trim();
    const email = $("#email").val().trim();
    const street = $("#address").val().trim();
    const address2 = $("#address2").val().trim();
    const city = $("#city").val().trim();
    const state = $("#state").val().trim();
    const pincode = $("#pinecode").val().trim();
    const country = $("#country").val().trim();

    const fullAddress = address2 ? `${street}, ${address2}` : street;
    // Basic validations
    if (!name || !email || !street || !city || !state || !pincode) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill all mandatory fields (except Country).",
      });
      submitBtn.prop("disabled", false); // Re-enable button
      return;
    }

    const payload = {
      name: name,
      email: email,
      address: {
        fullAddress: fullAddress,
        city: city,
        state: state,
        pincode: pincode,
        country: country,
      },
    };

    Swal.fire({
      title: "Submitting...",
      html: "Please wait while we submit your address.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Send to backend
    $.ajax({
      url: `/api/customers/address`, // change to full URL if needed
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
      // success: function (res) {
      //   Swal.fire({
      //     icon: 'success',
      //     title: 'Success!',
      //     text: 'Form submitted successfully.'
      //   });
      //   submitBtn.prop('disabled', false);
      // },
      success: function (res) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Form submitted successfully.",
        }).then(() => {
          window.location.href = "https://www.supernotes.info/";
        });
        submitBtn.prop("disabled", false);
      },

      error: function (err) {
        console.error(err);
        const errorMessage =
          err.responseJSON?.error ||
          "Something went wrong while submitting the form.";
        Swal.fire({
          icon: "error",
          title: "Submission Failed",
          text: errorMessage,
        });
        submitBtn.prop("disabled", false);
      },
    });
  });
});

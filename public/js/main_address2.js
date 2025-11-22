$(document).ready(function () {
  // Fill city/state on pincode blur
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

  // Helper to fetch city/state from pincode (returns a Promise)
  function fetchCityStateFromPincode(pincode) {
    return new Promise((resolve, reject) => {
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(pincode)) {
        return reject(new Error("Invalid pincode format"));
      }
      $.get(`https://api.postalpincode.in/pincode/${pincode}`)
        .done(function (response) {
          if (response[0].Status === "Success") {
            const postOffice = response[0].PostOffice[0];
            resolve({
              city: postOffice.District,
              state: postOffice.State,
              country: postOffice.Country,
            });
          } else {
            reject(new Error("Pincode not found"));
          }
        })
        .fail(function () {
          reject(new Error("Postal API request failed"));
        });
    });
  }

  $("form").on("submit", function (e) {
    e.preventDefault();
    const submitBtn = $(this).find('button[type="submit"]');
    submitBtn.prop("disabled", true);

    const name = $("#name").val().trim();
    const email = $("#email").val().trim();
    const street = $("#address").val().trim();
    const address2 = $("#address2").val().trim();
    let city = $("#city").val().trim();
    let state = $("#state").val().trim();
    const pincode = $("#pinecode").val().trim();
    let country = $("#country").val().trim();
    const studentName = $("#studentName").val().trim();
    const grade = $("#grade").val().trim();

    const fullAddress = address2 ? `${street}, ${address2}` : street;

    // Basic checks for required fields (except city/state) -- we'll try to auto-fill city/state
    if (!name || !email || !street || !pincode) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill all mandatory fields (name, email, street and pincode).",
      });
      submitBtn.prop("disabled", false);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get("paymentId");

    // If city/state are empty, try to fetch them via pincode before submitting
    const proceedWithSubmission = function () {
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
        studentName: studentName,
        grade: grade,
      };
      if (paymentId) {
        payload.paymentId = paymentId;
      }

      Swal.fire({
        title: "Submitting...",
        html: "Please wait while we submit your address.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Send to backend (same endpoint as main.js)
      $.ajax({
        url: `https://supernotes.onrender.com/api/customers/address`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),
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
    };

    if (!city || !state) {
      // Attempt to auto-fill from pincode first
      fetchCityStateFromPincode(pincode)
        .then((data) => {
          city = data.city;
          state = data.state;
          country = data.country;
          $("#city").val(city);
          $("#state").val(state);
          $("#country").val(country);
          proceedWithSubmission();
        })
        .catch((err) => {
          Swal.fire({
            icon: "error",
            title: "Pincode Error",
            text: "Could not auto-fill city/state from the given pincode. Please check the pincode or enter city/state manually.",
          });
          submitBtn.prop("disabled", false);
        });
    } else {
      proceedWithSubmission();
    }
  });
});

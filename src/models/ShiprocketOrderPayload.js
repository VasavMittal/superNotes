const { formatTimestampToShiprocketDate } = require("./utils");

function getShiprocketOrderPayload(order_id, order_date, billing_customer_name, billing_last_name, billing_address, billing_address_2, billing_city, billing_pincode, billing_state, billing_country, billing_email, billing_phone) {
  return {
    order_id: order_id,
    order_date: formatTimestampToShiprocketDate(order_date),
    pickup_location: "Home",
    comment: "",
    billing_customer_name: billing_customer_name,
    billing_last_name: billing_last_name,
    billing_address: billing_address,
    billing_address_2: billing_address_2,
    billing_city: billing_city,
    billing_pincode: billing_pincode,
    billing_state: billing_state,
    billing_country: billing_country,
    billing_email: billing_email,
    billing_phone: billing_phone,
    shipping_is_billing: true,
    shipping_customer_name: "",
    shipping_last_name: "",
    shipping_address: "",
    shipping_address_2: "",
    shipping_city: "",
    shipping_pincode: "",
    shipping_country: "",
    shipping_state: "",
    shipping_email: "",
    shipping_phone: "",
    order_items: [
      {
        name: "Notebook",
        sku: "4D391745823",
        units: 1,
        selling_price: 199.0,
        discount: 0,
        tax: 0,
        hsn: "",
      },
    ],
    payment_method: "prepaid",
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: 199.0,
    length: 14.8,
    breadth: 2.5,
    height: 21,
    weight: 0.3,
  };
}

module.exports = { getShiprocketOrderPayload };

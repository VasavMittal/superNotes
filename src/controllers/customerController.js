const Customer = require('../models/customer');

exports.addCustomer = async (req, res) => {
  try {
    const payload = req.body;

    const key = Object.keys(payload)[0];
    const data = payload[key];

    const customer = new Customer({
      key,
      name: data.name,
      email: data.email,
      address: data.address,
    });

    await customer.save();
    res.status(201).json({ message: "Customer saved", customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

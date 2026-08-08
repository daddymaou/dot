const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dhb6fmf5z",
  api_key: "812798942424596",
  api_secret: "vYCjEE6gkNSh0En6LqAVT6m3GjY"
});

module.exports = cloudinary;
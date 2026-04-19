const config = {
  _id: "emp-rs0",
  members: [{ _id: 0, host: "mongodb:27017" }]
};

try {
  rs.status();
  print("Replica set already initialized");
} catch (error) {
  rs.initiate(config);
  print("Replica set initialized");
}


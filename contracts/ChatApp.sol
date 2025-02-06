   // Add a new event to log document uploads
   event DocumentUploaded(address indexed patient, string cid, uint256 timestamp);

   // Function to add a document CID to a patient’s settings
   function addDocumentCID(string calldata cid) external {
    require(checkUserExists(msg.sender), "User not registered");
    require(bytes(cid).length > 0, "Invalid CID");
    patientSettings[msg.sender].documentCIDs.push(cid);
    emit DocumentUploaded(msg.sender, cid, block.timestamp);
   }
  
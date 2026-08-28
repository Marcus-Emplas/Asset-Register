function rowToAsset(row, historyRows) {
  return {
    id: row.asset_tag,
    assetTag: row.asset_tag,
    itemType: row.item_type,
    model: row.model,
    serialNumber: row.serial_number,
    expressTag: row.express_tag,
    macAddress: row.mac_address,
    ipAddress: row.ip_address,
    imei: row.imei,
    wsusGroup: row.wsus_group,
    telephoneNumber: row.telephone_number,
    poNumber: row.po_number,
    deviceBlocked: !!row.device_blocked,
    location: row.location,
    firstName: row.first_name,
    lastName: row.last_name,
    dateAcquired: row.date_acquired,
    dateDeployed: row.date_deployed,
    returnDate: row.return_date,
    dateRetired: row.date_retired,
    notes: row.notes,
    agreementSigned: !!row.agreement_signed,
    supplier: row.supplier,
    status: row.status,
    history: (historyRows || []).map((h) => ({ date: h.date, text: h.text })),
  };
}

module.exports = { rowToAsset };

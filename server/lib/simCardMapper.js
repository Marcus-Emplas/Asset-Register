function rowToSimCard(row) {
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    carrier: row.carrier,
    plan: row.plan,
    iccid: row.iccid,
    status: row.status,
    assignedAssetTag: row.assigned_asset_tag,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = { rowToSimCard };

import SqlDb from ":/lib/SqlDb";

export default async function() {
  await SqlDb.sequelize.close();
  return;
}
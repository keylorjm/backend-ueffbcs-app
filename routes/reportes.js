const express = require("express");
const router = express.Router();
const reporteCtrl = require("../controllers/controladorReporte");
const { authMiddleware, checkRole } = require("../middleware/authMiddleware");

// Solo administradores y profesores pueden generar reportes
router.get("/trimestre", authMiddleware, checkRole(["admin", "profesor"]), reporteCtrl.reporteTrimestral);
router.get("/final", authMiddleware, checkRole(["admin", "profesor"]), reporteCtrl.reporteFinal);

module.exports = router;



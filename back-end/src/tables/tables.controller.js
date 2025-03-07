const service = require("./tables.service");
const reservationService = require("../reservations/reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
const bodyDataHas = require("../errors/bodyDataHas");

/*----------MIDDLEWARE----------*/

function validTableName(req, res, next) {
    const { data } = req.body;
    const { table_name } = data;

    if (table_name.length < 2) {
        return next({ status: 400, message: `table_name must be more than one character` });
    }
    next();
}

function validCapacity(req, res, next) {
    const { data } = req.body;
    return typeof data.capacity !== "number" ? next({ status: 400, message: `capacity must be a number` }) : next();
}

// for "/:table_id/seat"
function tableHasCapacity(req, res, next) {
    const { table } = res.locals;
    return table.capacity >= res.locals.reservation.people ? next() : next({ status: 400, message: `Table does not have enough capacity` });
}

// for "/:table_id/seat"
function tableIsOccupied(req, res, next) {
    const { table } = res.locals;
    return table.free ? next() : next({ status: 400, message: `This table is currently occupied.` })
}

function tableIsNotOccupied(req, res, next) {
    const { table } = res.locals;
    return !table.reservation_id ? next({ status: 400, message: `Table with ID: ${table.table_id} is not occupied` }) : next();
    // return table.free ? next({status: 400, message: `Table with ID: ${table.table_id} is not occupied`}) : next();
}

// for "/:table_id/seat"
async function reservationExists(req, res, next) {
    const { data } = req.body;
    const { reservation_id } = data;
    // const { reservation_id } = res.locals.table;

    const reservation = await reservationService.read(reservation_id);

    if (reservation) {
        res.locals.reservation = reservation;
        return next();
    }
    next({ status: 404, message: `Reservation with ID: ${reservation_id} cannot be found` });
}

async function seatedReservationExists(req, res, next) {
    const { reservation_id } = res.locals.table;
    
    const reservation = await reservationService.read(reservation_id);

    if (reservation) {
        res.locals.reservation = reservation;
        return next();
    }
    next({ status: 404, message: `Reservation with ID: ${reservation_id} cannot be found` });
}


function reservationIsNotSeated(req, res, next){
    const {status} = res.locals.reservation;
    return status !== "seated" ? next() : next({status: 400, message: `Reservation must not be already seated.`})
}

// for "/:table_id/seat"
async function tableExists(req, res, next) {
    const { table_id } = req.params;
    const table = await service.read(table_id);
    console.log("tables controller table exists TABLE var: ", table);

    if (table) {
        res.locals.table = table;
        return next();
    }
    next({ status: 404, message: `Table with ID: ${table_id} cannot be found` });
}

/*----------CRUD----------*/

async function list(req, res) {
    const data = await service.list();
    res.json({ data });
}

async function create(req, res) {
    const data = await service.create(req.body.data);
    res.status(201).json({ data });
}

// for "/:table_id/seat"
async function update(req, res) {
    const updatedTable = {
        ...res.locals.table,
        table_id: res.locals.table.table_id,
        free: !res.locals.table.free,
        reservation_id: req.body.data.reservation_id
    }
    console.log("tables.controller: update function: req.body.data", req.body.data);

    const updatedReservation = {
        ...res.locals.reservation,
        status: "seated"
    }
    await reservationService.update(updatedReservation)
    const data = await service.update(updatedTable);
    res.json({ data });
}

// for "/:table_id/seat"
async function destroy(req, res) {
    const updatedTable = {
        ...res.locals.table,
        table_id: res.locals.table.table_id,
        // free: !res.locals.table.free,
        free: true,
        reservation_id: null
    }
    console.log("tables.controller: 'DESTROY' function: ");

    const updatedReservation = {
        ...res.locals.reservation,
        status: "finished"
    }
    await reservationService.update(updatedReservation)
    const data = await service.update(updatedTable);
    res.json({ data });
}

module.exports = {
    list: [asyncErrorBoundary(list)],
    create: [
        bodyDataHas("table_name"),
        bodyDataHas("capacity"),
        validTableName,
        validCapacity,
        asyncErrorBoundary(create)
    ],
    update: [
        bodyDataHas("reservation_id"),
        asyncErrorBoundary(tableExists),
        asyncErrorBoundary(reservationExists),
        tableIsOccupied,
        tableHasCapacity,
        reservationIsNotSeated,
        asyncErrorBoundary(update)
    ],
    destroy: [
        asyncErrorBoundary(tableExists),
        tableIsNotOccupied,
        asyncErrorBoundary(seatedReservationExists),
        asyncErrorBoundary(destroy),
    ]
}
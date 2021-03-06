import sensors from "../sensors";
import express from "express";
import simulatedata from "../simulation/SensorDataSimulation";
import getAlarmList from "../alarm/getAlarmList";

const router = express.Router();


function getSensors() {
    let result = {};
    let s = sensors.getSensors();
    for (let i = 0; i < s.length; i++) {
        let sensor = s[i];
        let type = sensor.meta.sensortype;

        if (result[type] === null || result[type] === undefined) {
            result[type] = [];
        }

        result[type].push(sensor);
    }
    return result;
}


router.get("/sensors/data", (req, res) => {
    let s = getSensors();
    let typeParam = req.query.type;
    let result = {};
    if (typeParam === null || typeParam === undefined || typeParam === '')
    {
        for (let type in s)
        {
            result[type] = s[type].map(item => {
                return {
                  id: item.id,
                  name: "sensor_" + item.id
                };
            });
        }
    }
    else {
      result = s[typeParam].map(item => {
          return {
            id: item.id,
            name: "sensor_" + item.id
          };
      });
    }
    res.send(result);
});

router.post("/sensors/data/stats", postSensorStatsHandler);


async function postSensorStatsHandler(req, res)
{
    const reqSensors = JSON.parse(req.body.sensors);
    const from = req.body.from;
    const to = req.body.to;
    let result = await getSensorStats(reqSensors, from, to);
    res.send(result);
}

async function getSensorStats(sensorIds, from, to)
{
    let result = {};
    const s = sensors.getSensors();
    for (let sensorId of sensorIds)
    {
        let i = await s[sensorId].storage.queryStats(new Date(from), new Date(to));
        result[sensorId] = i;
    }
    return result;
}

router.get("/sensors/simulation",getSensorSimulationHandler);

async function getSensorSimulationHandler(req, res)
{
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    const timeInterval = to * 1 - from * 1;
    let sensortype = req.query.sensortype;
    let s = getSensors();
    let sensors = [];
    let sensor = null;
    let rawValue = null;

    sensors = s[sensortype].map(item => {
        return {
            id: item.id,
            name: "sensor_" + item.id,
            interval: item.meta._monitor.interval,
            storage: item.storage
        };
    });

    for (let i = 0; i < sensors.length; i++)
    {
        sensor = sensors[i];
        const dataNumber = Math.round(timeInterval/(sensor.interval));
        for (let j = 0; j < dataNumber; j++) {
            let time = new Date(from * 1+ j*(sensor.interval));
            rawValue = simulatedata(sensortype);
            await sensor.storage._findAndUpdateValue(time, rawValue, sensor.id);
        }
    }
    res.send("OK");
}

router.get("/sensors/alarm",getSensorAlarmHandler);

async function getSensorAlarmHandler(req, res)
{
    let result = {};
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    result = await getAlarmList(from,to);
    res.send(result);
}

export default router;

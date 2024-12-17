import { Vnstock } from "vnstock-js";

const vnstock = new Vnstock();

vnstock.commodity.goldPrice().then((data) => console.log(data));

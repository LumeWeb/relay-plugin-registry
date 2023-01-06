import { register } from "./factory.js";
import Memory from "./backends/memory.js";
import Lmdb from "./backends/lmdb.js";

register("memory", Memory);
register("lmdb", Lmdb);

export { get as getStorage, has as hasStorage } from "./factory.js";

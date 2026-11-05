import { Bootstrap, RegisterModPackage } from "@hotbunny/hackhub-content-sdk";
import "./PretCommand";
import { registerHandbook, unregisterHandbook } from "./handbook";

@RegisterModPackage
export default class LibPret extends Bootstrap {
    OnModPackageLoaded() {
        registerHandbook();
    }

    OnModPackageUnloaded() {
        unregisterHandbook();
    }
}

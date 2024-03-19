import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DomainRegisterModule = buildModule("DomainRegister", (m) => {
    const domainRegister = m.contract("DomainRegister", [], {});
    return { domainRegister };
});

export default DomainRegisterModule;
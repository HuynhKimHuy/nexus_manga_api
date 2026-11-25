import { Module } from "@nestjs/common";
import { R2ClientProvider } from "./r2-client.provider.js";
import { R2StorageService } from "./r2-storage-service.js";

@Module({
    providers: [R2ClientProvider, R2StorageService],
    exports: [R2StorageService]
})
export class R2Module {}        
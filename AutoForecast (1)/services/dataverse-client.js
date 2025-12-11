// ==============================================================================
// DATAVERSE CLIENT - services/dataverse-client.js
// Handles all Dataverse API operations
// ==============================================================================

const { ClientSecretCredential } = require("@azure/identity");
const fetch = require("node-fetch");
const { config } = require('../config');

class DataverseClient {
    constructor(logger) {
        this.logger = logger.child('DATAVERSE');
        this.token = null;
        this.tokenExpiry = null;
        this.baseUrl = config.dataverse.url.replace(/\/$/, '');
    }

    async getToken() {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
            return this.token;
        }

        this.logger.debug('Acquiring new access token...');
        
        const credential = new ClientSecretCredential(
            config.dataverse.tenantId,
            config.dataverse.clientId,
            config.dataverse.clientSecret
        );
        
        const scope = `${this.baseUrl}/.default`;
        const tokenResponse = await credential.getToken(scope);
        
        this.token = tokenResponse.token;
        this.tokenExpiry = tokenResponse.expiresOnTimestamp;
        
        this.logger.debug('Token acquired successfully');
        return this.token;
    }

    async call(path, { method = "GET", payload = null } = {}) {
        this.logger.debug(`→ ${method} ${path.substring(0, 100)}...`);
        
        const url = `${this.baseUrl}/api/data/v9.2/${path}`;
        const token = await this.getToken();
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                ...(payload && { 'Content-Type': 'application/json' })
            },
            body: payload ? JSON.stringify(payload) : undefined
        });

        const responseText = await response.text();
        
        if (!response.ok) {
            throw new Error(`${method} ${path} failed: ${responseText}`);
        }

        this.logger.debug(`← ${method} → ${response.status}`);
        
        return response.status === 204 ? null : JSON.parse(responseText);
    }

    async batch(requests, label = "batch") {
        if (!requests.length) {
            this.logger.debug(`Skipping empty batch: ${label}`);
            return;
        }

        this.logger.info(`→ BATCH ${label}: ${requests.length} operations`);
        
        const batchId = `batch_${Date.now()}`;
        const changesetId = `cs_${Date.now()}`;
        
        let body = `--${batchId}\nContent-Type: multipart/mixed; boundary=${changesetId}\n\n`;
        
        requests.forEach((req, index) => {
            body += `--${changesetId}\n`;
            body += `Content-Type: application/http\n`;
            body += `Content-Transfer-Encoding: binary\n`;
            body += `Content-ID:${index + 1}\n\n`;
            body += `${req.method} ${this.baseUrl}/api/data/v9.2/${req.path} HTTP/1.1\n`;
            body += `Content-Type: application/json\n\n`;
            if (req.payload) body += JSON.stringify(req.payload);
            body += `\n`;
        });
        
        body += `--${changesetId}--\n--${batchId}--`;

        const token = await this.getToken();
        
        const response = await fetch(`${this.baseUrl}/api/data/v9.2/$batch`, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/mixed; boundary=${batchId}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            },
            body
        });

        this.logger.info(`← BATCH ${label}: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[${label}] batch failure: ${errorText}`);
        }
    }

    async batchInChunks(requests, chunkSize = 100, label = "batch") {
        for (let i = 0; i < requests.length; i += chunkSize) {
            const chunk = requests.slice(i, i + chunkSize);
            await this.batch(chunk, `${label}-chunk-${Math.floor(i / chunkSize) + 1}`);
        }
    }
}

module.exports = { DataverseClient };

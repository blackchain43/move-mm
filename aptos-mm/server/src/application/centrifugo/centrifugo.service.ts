import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { AppConfiguration, InjectAppConfig } from 'src/config';
@Injectable()
export class CentrifugoService {
  private readonly logger = new Logger(CentrifugoService.name);

  constructor(@InjectAppConfig() private appConfig: AppConfiguration) {}

  async publishMessage({
    channel,
    message,
  }: {
    channel: string;
    message: any;
  }) {
    this.logger.log(
      `publish message on channel ${channel} with data: ${JSON.stringify(
        message,
      )}`,
    );
    try {
      await axios.post(
        this.appConfig.centrifugo.url,
        {
          method: 'publish',
          params: {
            channel,
            data:
              typeof message === 'string' ? message : JSON.stringify(message),
          },
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `apikey ${this.appConfig.centrifugo.key}`,
          },
        },
      );
    } catch (err) {
      // this.logger.debug({ err });
    }
  }

  generateToken(address: string): string {
    return jwt.sign(
      {
        sub: address,
      },
      this.appConfig.centrifugo.hmacKey,
      JSON.parse(this.appConfig.centrifugo.jwtSignOptions),
    );
  }
}

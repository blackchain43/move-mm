import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationModule } from './application/application.module';
import { AuthModule } from './auth/auth.module';
import { appConfiguration, AppConfiguration } from './config';
import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfiguration],
    }),
    MongooseModule.forRootAsync({
      inject: [appConfiguration.KEY],
      useFactory: (config: AppConfiguration) => {
        return {
          uri: config.mongodb.connection,
          dbName: config.mongodb.dbName,
        };
      },
    }),
    ApplicationModule,
    AuthModule,
  ],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

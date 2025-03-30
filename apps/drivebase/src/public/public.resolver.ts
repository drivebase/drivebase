import { OnModuleInit } from '@nestjs/common';
import { Field, ObjectType, Query, Resolver } from '@nestjs/graphql';

@ObjectType()
class PingResponse {
  @Field(() => Date)
  time: Date;

  @Field(() => Date)
  startedAt: Date;
}

@Resolver()
export class PublicResolver implements OnModuleInit {
  startUpTime: Date;

  onModuleInit() {
    this.startUpTime = new Date();
  }

  @Query(() => String)
  version() {
    if (process.env.NODE_ENV === 'development') {
      return 'development';
    }
    return process.env.APP_VERSION || '0.0.0';
  }

  @Query(() => PingResponse)
  ping(): PingResponse {
    return {
      time: new Date(),
      startedAt: this.startUpTime,
    };
  }
}

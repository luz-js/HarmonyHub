import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserPayload = {
  id: string;
  email: string;
};

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentUserPayload => {
  const request = context.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
  return request.user as CurrentUserPayload;
});

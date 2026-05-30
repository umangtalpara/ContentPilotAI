import { PipeTransform, ArgumentMetadata, BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: any) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value;
    }
    
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errorMessages = result.error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`);
      throw new BadRequestException({
        statusCode: 400,
        message: errorMessages,
        error: 'Bad Request',
      });
    }
    return result.data;
  }
}

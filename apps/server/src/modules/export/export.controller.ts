import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ExportService } from './export.service';

interface SaveFileDto {
  content: string;
  filename: string;
  extension: string;
}

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('save')
  async saveFile(@Body() body: SaveFileDto) {
    if (!body.content || !body.filename || !body.extension) {
      throw new HttpException(
        'Content, filename, and extension are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.exportService.saveFile(
      body.content,
      body.filename,
      body.extension,
    );
    if (!result.success && result.error !== 'Dialog not supported') {
      throw new HttpException(
        result.error || 'Failed to save file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return result;
  }
}

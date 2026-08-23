import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RentalDto {
  @ApiProperty()
  @IsInt()
  sizeEu: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  qty: number;
}

export class HoldBookingDto {
  @ApiProperty()
  @IsInt()
  slotId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  partySize: number;

  @ApiProperty({ type: [RentalDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalDto)
  rentals?: RentalDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  ownSkatesCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  addonIds?: number[];
}

export class PatchBookingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  partySize?: number;

  @ApiProperty({ type: [RentalDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalDto)
  rentals?: RentalDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  ownSkatesCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  addonIds?: number[];
}

export class ConfirmBookingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentNonce?: string;
}

export class CheckInDto {
  @ApiProperty()
  @IsString()
  code: string;
}

export class GenerateSlotsDto {
  @ApiProperty()
  @IsString()
  date: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  times: string[];
}

export class BlockSlotDto {
  @ApiProperty()
  @IsBoolean()
  blocked: boolean;
}

export class RinkDto {
  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  mode: 'public' | 'private';

  @ApiProperty()
  @IsInt()
  capacity: number;

  @ApiProperty()
  @IsInt()
  priceCents: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ReviewDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  rating: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class FavoriteDto {
  @ApiProperty()
  @IsInt()
  rinkId: number;
}

export class StockDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  stockTotal: number;
}

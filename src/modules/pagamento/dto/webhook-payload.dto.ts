export class StripeWebhookDto {
  id!: string;
  type!: string;
  data!: {
        object: any;
    };
  created!: number;
}
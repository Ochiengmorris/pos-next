// import { api } from "@/lib/api.server";
// import { describe } from "node:test";

//   describe('receipt (E2)', () => {
//     const receipt = async (saleId: string) =>
//       (await api().get(`/api/v1/sales/${saleId}/receipt`).set(auth(token)).expect(200)).body;

//     it('is provisional while pending, then carries the official data once accepted', async () => {
//       const sale = (await sell().expect(201)).body;
//       let r = await receipt(sale.id);
//       expect(r.etims.status).toBe('PENDING');
//       expect(r.etims.signature).toBeNull();
//       expect(r.etims.qrPayload).toBeNull();
//       expect(r.etims.invoiceNo).toBeNull();

//       await drain();
//       r = await receipt(sale.id);
//       expect(r.etims.status).toBe('MOCK_ACCEPTED'); // never plain ACCEPTED for the mock
//       expect(r.etims.signature).toMatch(/^MOCK/);
//       expect(r.etims.copy).toBe(0);
//     });

//     it('labels later prints as COPY, only for accepted invoices', async () => {
//       const sale = (await sell().expect(201)).body;
//       await api().post(`/api/v1/etims/sales/${sale.id}/printed`).set(auth(token)).expect(400); // still pending
//       await drain();
//       await api().post(`/api/v1/etims/sales/${sale.id}/printed`).set(auth(token)).expect(201);
//       expect((await receipt(sale.id)).etims.copy).toBe(1);
//     });

//     it('breaks VAT down by tax class, including exempt lines', async () => {
//       const milk = await prisma.product.create({
//         data: { sku: 'MILK', name: 'Milk', price: 65, costPrice: 54, taxRate: 0, taxTyCd: 'A', stockQty: 10, reorderLevel: 2 },
//       });
//       const sale = (
//         await api().post('/api/v1/sales').set(auth(token))
//           .send({ items: [{ productId, quantity: 1 }, { productId: milk.id, quantity: 1 }], payments: [{ method: 'CASH', amount: 135 }] })
//           .expect(201)
//       ).body;
//       const r = await receipt(sale.id);
//       expect(r.taxBreakdown.map((t: { code: string }) => t.code)).toEqual(['A', 'B']);
//       const b = r.taxBreakdown.find((t: { code: string }) => t.code === 'B');
//       expect(b.vat).toBe('9.66'); // 70 x 16 / 116
//       expect(r.taxBreakdown.find((t: { code: string }) => t.code === 'A').vat).toBe('0.00');
//     });

//     it('lists the eTIMS status on sales and keeps a cashier out of other cashiers\' invoices', async () => {
//       const sale = (await sell().expect(201)).body;
//       expect(sale.etims).toBe('PENDING');
//       const other = await login(app, 'cashier2@test.local');
//       await api().post(`/api/v1/etims/sales/${sale.id}/printed`).set(auth(other)).expect(404);
//     });
//   });

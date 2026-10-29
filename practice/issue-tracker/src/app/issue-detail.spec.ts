import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect } from 'vitest';
import { IssueDetail } from './issue-detail';
import { IssueService } from './issue.service';

describe('Деталь заявки', () => {
  it('обновляет выбранный ID и явно показывает неизвестную запись', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'issues/:id', component: IssueDetail }])] });
    const service = TestBed.inject(IssueService);
    service.issues.set([{ id: 'test-1', title: 'Учебный тест', description: '', status: 'OPEN', priority: 'LOW', createdAt: '2026-10-01T09:00:00Z' }]);
    const harness = await RouterTestingHarness.create('/issues/test-1');
    expect(harness.routeNativeElement?.textContent).toContain('Учебный тест');
    await harness.navigateByUrl('/issues/missing');
    expect(harness.routeNativeElement?.textContent).toContain('Заявка не найдена');
    expect(harness.routeNativeElement?.textContent).not.toContain('Учебный тест');
  });
});

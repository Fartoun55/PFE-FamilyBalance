import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  EducationResource,
  EducationResourceFormValue,
  LearningPath,
  NewsletterPreview,
  ParentToolboxItem,
} from '../../features/education/models/education.models';

interface ResourceResponse {
  status: string;
  count: number;
  resources: EducationResource[];
}

interface CategoriesResponse {
  status: string;
  categories: string[];
}

interface SingleResourceResponse {
  status: string;
  message: string;
  resource: EducationResource;
}

interface DeleteResourceResponse {
  status: string;
  message: string;
}

interface PathsResponse {
  status: string;
  count: number;
  paths: LearningPath[];
}

interface ProgressResponse {
  status: string;
  message: string;
  progress: {
    pathId: string;
    stepId: string;
    completedStepIds: string[];
    progressPercent: number;
    badges: string[];
  };
}

interface ToolboxResponse {
  status: string;
  count: number;
  items: ParentToolboxItem[];
}

interface CreateToolboxItemResponse {
  status: string;
  message: string;
  item: ParentToolboxItem;
}

interface NewsletterResponse {
  status: string;
  newsletter: NewsletterPreview;
}

@Injectable({ providedIn: 'root' })
export class EducationService {
  constructor(private readonly http: HttpClient) {}

  getResources(params: { age?: number; category?: string; search?: string }): Observable<ResourceResponse> {
    return this.http.get<ResourceResponse>(`${API_BASE_URL}/education/resources`, {
      withCredentials: true,
      params: {
        ...(params.age ? { age: String(params.age) } : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    });
  }

  getCategories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(`${API_BASE_URL}/education/resources/categories`, {
      withCredentials: true,
    });
  }

  // --- Administration des ressources (Admin uniquement) ---------------------------

  adminListResources(): Observable<ResourceResponse> {
    return this.http.get<ResourceResponse>(`${API_BASE_URL}/education/admin/resources`, {
      withCredentials: true,
    });
  }

  private buildResourceFormData(value: EducationResourceFormValue, file: File | null): FormData {
    const formData = new FormData();
    formData.append('title', value.title);
    formData.append('description', value.description);
    formData.append('category', value.category);
    formData.append('ageMin', String(value.ageMin));
    formData.append('ageMax', String(value.ageMax));
    formData.append('contentType', value.contentType);
    if (value.externalUrl) formData.append('externalUrl', value.externalUrl);
    if (value.themes) formData.append('themes', value.themes);
    if (value.estimatedMinutes != null) formData.append('estimatedMinutes', String(value.estimatedMinutes));
    if (value.difficulty) formData.append('difficulty', value.difficulty);
    if (file) formData.append('file', file, file.name);
    return formData;
  }

  adminCreateResource(value: EducationResourceFormValue, file: File | null): Observable<SingleResourceResponse> {
    return this.http.post<SingleResourceResponse>(
      `${API_BASE_URL}/education/admin/resources`,
      this.buildResourceFormData(value, file),
      { withCredentials: true }
    );
  }

  adminUpdateResource(
    id: string,
    value: EducationResourceFormValue,
    file: File | null
  ): Observable<SingleResourceResponse> {
    return this.http.patch<SingleResourceResponse>(
      `${API_BASE_URL}/education/admin/resources/${id}`,
      this.buildResourceFormData(value, file),
      { withCredentials: true }
    );
  }

  adminDeleteResource(id: string): Observable<DeleteResourceResponse> {
    return this.http.delete<DeleteResourceResponse>(`${API_BASE_URL}/education/admin/resources/${id}`, {
      withCredentials: true,
    });
  }

  adminPublishResource(id: string): Observable<SingleResourceResponse> {
    return this.http.patch<SingleResourceResponse>(
      `${API_BASE_URL}/education/admin/resources/${id}/publish`,
      {},
      { withCredentials: true }
    );
  }

  adminUnpublishResource(id: string): Observable<SingleResourceResponse> {
    return this.http.patch<SingleResourceResponse>(
      `${API_BASE_URL}/education/admin/resources/${id}/unpublish`,
      {},
      { withCredentials: true }
    );
  }

  getLearningPaths(): Observable<PathsResponse> {
    return this.http.get<PathsResponse>(`${API_BASE_URL}/education/learning/paths`, {
      withCredentials: true,
    });
  }

  completeStep(pathId: string, stepId: string): Observable<ProgressResponse> {
    return this.http.post<ProgressResponse>(
      `${API_BASE_URL}/education/learning/paths/${pathId}/steps/${stepId}/complete`,
      {},
      { withCredentials: true }
    );
  }

  getToolbox(): Observable<ToolboxResponse> {
    return this.http.get<ToolboxResponse>(`${API_BASE_URL}/education/toolbox`, {
      withCredentials: true,
    });
  }

  createContract(payload: { title: string; content: string }): Observable<CreateToolboxItemResponse> {
    return this.http.post<CreateToolboxItemResponse>(`${API_BASE_URL}/education/toolbox/contracts`, payload, {
      withCredentials: true,
    });
  }

  createSchedule(payload: {
    title: string;
    content: string;
    activities?: string[];
    startDate?: string;
    endDate?: string;
  }): Observable<CreateToolboxItemResponse> {
    return this.http.post<CreateToolboxItemResponse>(`${API_BASE_URL}/education/toolbox/schedules`, payload, {
      withCredentials: true,
    });
  }

  getNewsletterPreview(): Observable<NewsletterResponse> {
    return this.http.get<NewsletterResponse>(`${API_BASE_URL}/education/newsletter/preview`, {
      withCredentials: true,
    });
  }
}

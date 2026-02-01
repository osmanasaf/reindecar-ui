import { BaseApi } from './client'
import type {
    PaginatedResponse,
    Branch,
    CreateBranchForm
} from '@/types'

class BranchesApiService extends BaseApi {
    protected readonly basePath = '/branches'

    async getAll(): Promise<PaginatedResponse<Branch>> {
        return this.getList<Branch>()
    }

    async getActive(): Promise<Branch[]> {
        const response = await this.get<Branch[] | PaginatedResponse<Branch>>('/active')
        if (response && typeof response === 'object' && 'content' in response) {
            const paginated = response as PaginatedResponse<Branch>
            return Array.isArray(paginated.content) ? paginated.content : []
        }
        return Array.isArray(response) ? response : []
    }

    async getById(id: number): Promise<Branch> {
        return this.get(`/${id}`)
    }

    async create(branch: CreateBranchForm): Promise<Branch> {
        return this.post('', branch)
    }

    async update(id: number, branch: Partial<CreateBranchForm>): Promise<Branch> {
        return this.put(`/${id}`, branch)
    }

    async updateStatus(id: number, active: boolean): Promise<Branch> {
        return this.patch(`/${id}/status`, { active })
    }

    async deleteById(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }
}

export const branchesApi = new BranchesApiService()

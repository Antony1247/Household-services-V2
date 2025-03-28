export default {
    template: `
        <div>
            <!-- Admin Navbar -->
            <nav class="navbar navbar-dark bg-dark">
                <div class="container-fluid">
                    <a class="navbar-brand" href="/#/admin-dashboard">Admin Dashboard</a>
                    <div>
                        <router-link to="/servicesList" class="nav-link d-inline text-white">Manage Services</router-link>
                        <router-link to="/professionalsList" class="nav-link d-inline text-white">Manage Professionals</router-link>
                        <router-link to="/customers" class="nav-link d-inline text-white">Manage Customers</router-link>
                        <router-link to="/service-requests" class="nav-link d-inline text-white">service requests</router-link>
                        <router-link to="/export-service-requests" class="nav-link d-inline text-white">Export CSV</router-link>
                        <router-link to="/admin-search" class="nav-link d-inline text-white">Search</router-link>
                        <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                    </div>
                </div>
            </nav>

            <!-- Main Content -->
            <div class="container mt-5">
                <h1 class="text-center">Available Services</h1>
                
                <!-- Only Admins Can Add a Service -->
                <button v-if="isAdmin" class="btn btn-primary mb-3" @click="openAddServiceModal">
                    Add Service
                </button>

                <div v-if="services.length === 0" class="alert alert-warning text-center">No services found</div>
                
                <table v-else class="table table-striped mt-3">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Base Price</th>
                            <th>Description</th>
                            <th>Professional Type</th>
                            <th v-if="isAdmin">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="service in services" :key="service.id">
                            <td>{{ service.id }}</td>
                            <td>{{ service.name }}</td>
                            <td>{{ service.base_price }}</td>
                            <td>{{ service.description }}</td>
                            <td>{{ service.professional_type }}</td>
                            <td v-if="isAdmin">
                                <button class="btn btn-sm btn-warning me-2" @click="openEditServiceModal(service)">Edit</button>
                                <button class="btn btn-sm btn-danger" @click="deleteService(service.id)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Add / Edit Service Modal -->
                <div v-if="showModal" class="modal fade show d-block" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">{{ isEditing ? "Edit Service" : "Add Service" }}</h5>
                                <button type="button" class="btn-close" @click="closeModal"></button>
                            </div>
                            <div class="modal-body">
                                <form @submit.prevent="isEditing ? updateService() : addService()">
                                    <div class="mb-3">
                                        <label class="form-label">Service Name</label>
                                        <input type="text" class="form-control" v-model="serviceForm.name" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Base Price</label>
                                        <input type="number" class="form-control" v-model="serviceForm.base_price" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" v-model="serviceForm.description" required></textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Professional Type</label>
                                        <select class="form-control" v-model="serviceForm.professional_type" required>
                                            <option value="" disabled>Select a professional type</option>
                                            <option v-for="professional in professionals" :key="professional.id" :value="professional.specialization">
                                                {{ professional.specialization }} ({{ professional.full_name }})
                                            </option>
                                        </select>
                                    </div>
                                    <button type="submit" class="btn btn-success">{{ isEditing ? "Update" : "Add" }}</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="showModal" class="modal-backdrop fade show"></div>
            </div>
        </div>
    `,
    data() {
        return {
            services: [],
            professionals: [],  // Store approved professionals
            showModal: false,
            isEditing: false,
            serviceForm: {
                id: null,
                name: "",
                base_price: "",
                description: "",
                professional_type: ""
            }
        };
    },
    computed: {
        isAdmin() {
            return localStorage.getItem("role") === "Admin";
        }
    },
    methods: {
        async fetchServices() {
            try {
                const response = await axios.get('/api/services', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.services = response.data;
            } catch (error) {
                console.error("Error fetching services:", error);
                this.services = [];
            }
        },
        async fetchProfessionals() {
            try {
                const response = await axios.get('/api/professionals?status=Approved', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.professionals = response.data;
            } catch (error) {
                console.error("Error fetching professionals:", error);
                this.professionals = [];
            }
        },
        openAddServiceModal() {
            this.isEditing = false;
            this.serviceForm = { id: null, name: "", base_price: "", description: "", professional_type: "" };
            this.fetchProfessionals();  // Refresh professionals before opening the modal
            this.showModal = true;
        },
        openEditServiceModal(service) {
            this.isEditing = true;
            this.serviceForm = { ...service };
            this.fetchProfessionals();  // Refresh professionals before editing
            this.showModal = true;
        },
        closeModal() {
            this.showModal = false;
        },
        async addService() {
            try {
                const response = await axios.post('/api/services', this.serviceForm, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.services.push(response.data);
                this.closeModal();
            } catch (error) {
                console.error("Error adding service:", error);
            }
        },
        async updateService() {
            try {
                await axios.put(`/api/services/${this.serviceForm.id}`, this.serviceForm, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                const index = this.services.findIndex(s => s.id === this.serviceForm.id);
                if (index !== -1) {
                    this.services[index] = { ...this.serviceForm };
                }
                this.closeModal();
            } catch (error) {
                console.error("Error updating service:", error);
            }
        },
        async deleteService(serviceId) {
            if (!confirm("Are you sure you want to delete this service?")) return;
            try {
                await axios.delete(`/api/services/${serviceId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.services = this.services.filter(s => s.id !== serviceId);
            } catch (error) {
                console.error("Error deleting service:", error);
            }
        },
        logout() {
            axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(() => {
                    localStorage.clear();
                    window.location.href = "/#/login";
                })
                .catch(error => console.error(error));
        }
    },
    mounted() {
        this.fetchServices();
        this.fetchProfessionals();
    }
};

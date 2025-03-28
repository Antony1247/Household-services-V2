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

        <div class="container mt-5">
            <h1 class="text-center">Available Professionals</h1>
            <div v-if="professionals.length === 0" class="alert alert-warning text-center">No professionals found</div>
            
            <table v-else class="table table-striped mt-3">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Specialization</th>
                        <th>Experience (Years)</th>
                        <th>Status</th>
                        <th>Documents</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="professional in professionals" :key="professional.id">
                        <td>{{ professional.id }}</td>
                        <td>{{ professional.full_name }}</td>
                        <td>{{ professional.specialization }}</td>
                        <td>{{ professional.experience }}</td>
                        <td>
                            <span v-if="professional.status === 'Approved'" class="badge bg-success">Approved</span>
                            <span v-else-if="professional.status === 'Rejected'" class="badge bg-danger">Rejected</span>
                            <span v-else class="badge bg-warning">Pending</span>
                            <span v-if="professional.blocked_status" class="badge bg-dark ms-2">Blocked</span> 
                        </td>
                        <td>
                            <span v-if="professional.documents && professional.documents.length">
                                <span v-for="(doc, index) in professional.documents" :key="doc">
                                                    <a :href="'http://127.0.0.1:5000/uploads/documents/' + encodeURIComponent(doc)" target="_blank">
                                                    {{ doc }}
                                                        </a>
                                    <span v-if="index < professional.documents.length - 1">, </span>
                                </span>
                            </span>
                            <span v-else>No documents</span>
                        </td>
                        <td>
                            <router-link :to="'/professionals/' + professional.id" class="btn btn-sm btn-primary me-2">
                                View Details
                            </router-link>
                            <button v-if="isAdmin && professional.status === 'Pending'" class="btn btn-sm btn-success me-2" @click="approveProfessional(professional.id)">Approve</button>
                            <button v-if="isAdmin && professional.status === 'Pending'" class="btn btn-sm btn-danger me-2" @click="rejectProfessional(professional.id)">Reject</button>
                            <button v-if="isAdmin && !professional.blocked_status" class="btn btn-sm btn-dark me-2" @click="blockProfessional(professional.id)">Block</button>
                            <button v-if="isAdmin && professional.blocked_status" class="btn btn-sm btn-warning" @click="unblockProfessional(professional.id)">Unblock</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    `,
    
    data() {
        return { professionals: [] };
    },

    computed: {
        isAdmin() {
            return localStorage.getItem("role") === "Admin";
        }
    },

    methods: {
        async fetchProfessionals() {
            try {
                const response = await axios.get('/api/professional-list', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                console.log("Fetched Professionals Data:", response.data);

                if (Array.isArray(response.data)) {
                    this.professionals = response.data.map(professional => ({
                        ...professional,
                        documents: professional.documents || []
                    }));
                } else {
                    console.error("API did not return an array:", response.data);
                    this.professionals = [];
                }
            } catch (error) {
                console.error("Error fetching professionals:", error.response ? error.response.data : error.message);
                this.professionals = [];
            }
        },

        async approveProfessional(professionalId) {
            try {
                await axios.put(`/api/professionals/${professionalId}/approve`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.fetchProfessionals();
            } catch (error) {
                console.error("Error approving professional:", error);
            }
        },

        async rejectProfessional(professionalId) {
            try {
                await axios.put(`/api/professionals/${professionalId}/reject`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.fetchProfessionals();
            } catch (error) {
                console.error("Error rejecting professional:", error);
            }
        },

        async blockProfessional(professionalId) {
            try {
                await axios.put(`/api/professionals/${professionalId}/block`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.fetchProfessionals();
            } catch (error) {
                console.error("Error blocking professional:", error);
            }
        },

        async unblockProfessional(professionalId) {
            try {
                await axios.put(`/api/professionals/${professionalId}/unblock`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.fetchProfessionals();
            } catch (error) {
                console.error("Error unblocking professional:", error);
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
        this.fetchProfessionals();
    }
};
